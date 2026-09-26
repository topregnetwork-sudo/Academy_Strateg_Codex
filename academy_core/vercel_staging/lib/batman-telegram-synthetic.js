const { randomUUID } = require('node:crypto')
const { sendText } = require('./telegram-bot')

const TEST_TEXT = 'ТЕСТ · Batman runtime: закрытый синтетический Telegram round trip. Статусы кандидатов, запись на Zoom и webhook не изменялись.'

function assertSyntheticUpdate(update, expectedChatId) {
  const updateId = Number(update?.update_id)
  const chatId = String(update?.message?.chat?.id || '')
  const userId = String(update?.message?.from?.id || '')
  if (!Number.isSafeInteger(updateId) || !chatId || !userId) throw new Error('synthetic_update_invalid')
  if (chatId !== String(expectedChatId) || userId !== String(expectedChatId)) throw new Error('synthetic_recipient_mismatch')
  return { updateId, chatId, userId }
}

function createSyntheticTelegramRepository(pool) {
  return {
    async ingestAndQueue({ botKey, update, expectedChatId, campaignId }) {
      const normalized = assertSyntheticUpdate(update, expectedChatId)
      const client = await pool.connect()
      try {
        await client.query('begin')
        await client.query(`
          insert into batman_campaigns(id, campaign_kind, audience_kind, synthetic, status)
          values ($1, 'telegram_round_trip', 'owner_single_account', true, 'queued')
          on conflict (id) do nothing
        `, [campaignId])
        const inserted = await client.query(`
          insert into batman_telegram_updates(bot_key, update_id, normalized_command, payload)
          values ($1, $2, 'synthetic_round_trip', $3::jsonb)
          on conflict (bot_key, update_id) do nothing
          returning update_id
        `, [botKey, normalized.updateId, JSON.stringify({ synthetic: true, chat_id: normalized.chatId, user_id: normalized.userId })])
        const idempotencyKey = `${campaignId}:${botKey}:${normalized.updateId}:reply`
        const existing = await client.query(`
          select id, delivery_state, telegram_message_id from batman_telegram_outbox
          where idempotency_key = $1
        `, [idempotencyKey])
        let outbox = existing.rows[0]
        if (!outbox) {
          const created = await client.query(`
            insert into batman_telegram_outbox(id, chat_id, message_kind, payload, idempotency_key)
            values ($1, $2, 'synthetic_round_trip', $3::jsonb, $4)
            returning id, delivery_state, telegram_message_id
          `, [randomUUID(), normalized.chatId, JSON.stringify({ text: TEST_TEXT, synthetic: true, campaign_id: campaignId }), idempotencyKey])
          outbox = created.rows[0]
        }
        await client.query('commit')
        return { inserted: inserted.rowCount === 1, outbox, ...normalized }
      } catch (error) {
        await client.query('rollback')
        throw error
      } finally {
        client.release()
      }
    },

    async leaseOne(outboxId) {
      const result = await pool.query(`
        update batman_telegram_outbox
        set delivery_state = 'processing', last_error = null
        where id = $1 and delivery_state = 'queued'
        returning id, chat_id, payload, idempotency_key
      `, [outboxId])
      return result.rows[0] || null
    },

    async markDelivered(job, messageId, campaignId) {
      const client = await pool.connect()
      try {
        await client.query('begin')
        await client.query(`
          update batman_telegram_outbox set delivery_state='delivered', telegram_message_id=$2,
            delivered_at=now(), last_error=null where id=$1 and delivery_state='processing'
        `, [job.id, messageId])
        await client.query(`update batman_campaigns set status='delivered' where id=$1`, [campaignId])
        await client.query('commit')
      } catch (error) {
        await client.query('rollback')
        throw error
      } finally {
        client.release()
      }
    },

    async markFailed(job, errorCode, campaignId) {
      await pool.query(`update batman_telegram_outbox set delivery_state='failed', last_error=$2 where id=$1`, [job.id, errorCode])
      await pool.query(`update batman_campaigns set status='failed' where id=$1`, [campaignId])
    },
  }
}

async function syntheticRoundTrip({ repository, botKey, botToken, expectedChatId, campaignId, update, fetchImpl = fetch }) {
  const ingested = await repository.ingestAndQueue({ botKey, update, expectedChatId, campaignId })
  if (ingested.outbox.delivery_state === 'delivered') {
    return { state: 'delivered', duplicate: true, messageId: Number(ingested.outbox.telegram_message_id) }
  }
  const job = await repository.leaseOne(ingested.outbox.id)
  if (!job) return { state: ingested.outbox.delivery_state, duplicate: true }
  try {
    const sent = await sendText({ botToken, chatId: expectedChatId, text: job.payload.text, idempotencyKey: job.idempotency_key, fetchImpl })
    await repository.markDelivered(job, sent.messageId, campaignId)
    return { state: 'delivered', duplicate: !ingested.inserted, messageId: sent.messageId }
  } catch (error) {
    const code = String(error?.code || error?.message || 'telegram_send_failed').slice(0, 120)
    await repository.markFailed(job, code, campaignId)
    throw error
  }
}

module.exports = { TEST_TEXT, assertSyntheticUpdate, createSyntheticTelegramRepository, syntheticRoundTrip }
