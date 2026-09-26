const { sendText } = require('./telegram-bot')

function createTildaTelegramOutboxRepository(pool) {
  return {
    async queueSelftest(idempotencyKey) {
      const result = await pool.query(`update event_registration_outbox
        set delivery_state='queued', payload=jsonb_set(payload,'{text}',to_jsonb(('ТЕСТ · ' || (payload->>'text'))::text))
        where idempotency_key=$1 and delivery_state='held'
          and idempotency_key like 'tilda:v1:8607529:%:tilda-intake-103-selftest-%:registration:telegram_forum_mirror:v%'
        returning id`, [idempotencyKey])
      return result.rowCount === 1
    },
    async claimOne(idempotencyKey) {
      const result = await pool.query(`update event_registration_outbox
        set delivery_state='processing', delivery_attempts=delivery_attempts+1, last_error=null
        where id=(select id from event_registration_outbox where idempotency_key=$1 and delivery_state in ('queued','failed') for update skip locked)
        returning id,chat_id::text,message_thread_id,payload,idempotency_key`, [idempotencyKey])
      return result.rows[0] || null
    },
    async read(idempotencyKey) {
      const result = await pool.query(`select delivery_state,delivery_attempts,telegram_message_id,last_error
        from event_registration_outbox where idempotency_key=$1`, [idempotencyKey])
      return result.rows[0] || null
    },
    async markDelivered(id, messageId) {
      await pool.query(`update event_registration_outbox set delivery_state='delivered',telegram_message_id=$2,
        delivered_at=now(),last_error=null where id=$1 and delivery_state='processing'`, [id, messageId])
    },
    async markFailed(id, code) {
      await pool.query(`update event_registration_outbox set delivery_state='failed',last_error=$2
        where id=$1 and delivery_state='processing'`, [id, code])
    },
  }
}

async function deliverTildaTelegramOutbox({ repository, idempotencyKey, botToken, fetchImpl = fetch }) {
  const before = await repository.read(idempotencyKey)
  if (!before) throw new Error('tilda_outbox_not_found')
  if (before.delivery_state === 'delivered') return { state: 'delivered', duplicate: true, messageId: Number(before.telegram_message_id) }
  const job = await repository.claimOne(idempotencyKey)
  if (!job) return { state: before.delivery_state, duplicate: true, messageId: before.telegram_message_id ? Number(before.telegram_message_id) : null }
  try {
    const payload = job.payload || {}
    if (Object.keys(payload).some((key) => ['name','email','phone','identity_key'].includes(key))) throw new Error('tilda_outbox_pii_detected')
    const sent = await sendText({ botToken, chatId: job.chat_id, messageThreadId: Number(job.message_thread_id), text: String(payload.text || ''), idempotencyKey: job.idempotency_key, fetchImpl })
    await repository.markDelivered(job.id, sent.messageId)
    return { state: 'delivered', duplicate: false, messageId: sent.messageId, chatId: job.chat_id, messageThreadId: Number(job.message_thread_id) }
  } catch (error) {
    const code = String(error?.code || error?.message || 'telegram_send_failed').slice(0, 120)
    await repository.markFailed(job.id, code)
    throw error
  }
}

async function releaseAndDeliverTildaSelftest(options) {
  const queued = await options.repository.queueSelftest(options.idempotencyKey)
  const result = await deliverTildaTelegramOutbox(options)
  return { ...result, selftest_released: queued }
}

module.exports = { createTildaTelegramOutboxRepository, deliverTildaTelegramOutbox, releaseAndDeliverTildaSelftest }
