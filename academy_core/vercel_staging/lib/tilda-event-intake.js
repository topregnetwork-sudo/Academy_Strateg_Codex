const crypto = require('node:crypto')

const PROJECT_ID = '8607529'
const CHAT_ID = '-1004404302282'
const ROUTES = Object.freeze({
  '4215769301': { eventCode: 'chelyabinsk-2026-09-28', city: 'Челябинск', threadId: 2 },
  '3744984501': { eventCode: 'minsk-2026-09-28', city: 'Минск', threadId: 4 },
})

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`
  return JSON.stringify(value)
}
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex') }

function normalize(input) {
  const projectId = String(input?.project_id || '').trim()
  const formId = String(input?.form_id || '').trim()
  const transactionId = String(input?.transaction_id || '').trim()
  const identityKey = String(input?.identity_key || '').trim()
  const test = input?.test === true || String(input?.test || '').toLowerCase() === 'test'
  if (projectId !== PROJECT_ID) throw new Error('project_not_allowed')
  const route = ROUTES[formId]
  if (!route) throw new Error('form_not_allowed')
  if (!transactionId || transactionId.length > 160) throw new Error('transaction_id_invalid')
  if (!test && (!identityKey || identityKey.length > 160)) throw new Error('identity_key_invalid')
  return { projectId, formId, transactionId, identityKey, test, route }
}

function piiFreePayload(route) {
  return { text: `Новая регистрация на мероприятие · ${route.city}`, city: route.city, event_code: route.eventCode }
}

function createTildaIntakeRepository(pool) {
  return {
    async ingest(input, { mirrorEnabled = false } = {}) {
      const normalized = normalize(input)
      if (normalized.test) return { test: true, inserted: false, registrations: 0, effects: 0 }
      const client = await pool.connect()
      try {
        await client.query('begin')
        const inbound = await client.query(`insert into tilda_inbound_submissions(id,project_id,form_id,transaction_id,payload_fingerprint,payload)
          values ($1,$2,$3,$4,$5,$6::jsonb) on conflict (project_id,form_id,transaction_id) do nothing returning id`,
          [crypto.randomUUID(), normalized.projectId, normalized.formId, normalized.transactionId, sha256(stableJson(input)), JSON.stringify(input)])
        if (!inbound.rowCount) { await client.query('rollback'); return { test: false, inserted: false, duplicate: true, registrations: 0, effects: 0 } }
        const registrationId = crypto.randomUUID()
        const registration = await client.query(`insert into event_registrations(id,inbound_submission_id,event_code,city,identity_key)
          values ($1,$2,$3,$4,$5) on conflict (event_code,identity_key) do nothing returning id`,
          [registrationId, inbound.rows[0].id, normalized.route.eventCode, normalized.route.city, normalized.identityKey])
        if (!registration.rowCount) { await client.query('rollback'); return { test: false, inserted: false, duplicate: true, registrations: 0, effects: 0 } }
        const effectKey = `tilda:v1:${normalized.projectId}:${normalized.formId}:${normalized.transactionId}:registration:telegram_forum_mirror:v1`
        await client.query(`insert into event_registration_outbox(id,registration_id,chat_id,message_thread_id,payload,idempotency_key,delivery_state)
          values ($1,$2,$3,$4,$5::jsonb,$6,$7)`,
          [crypto.randomUUID(), registrationId, CHAT_ID, normalized.route.threadId, JSON.stringify(piiFreePayload(normalized.route)), effectKey, mirrorEnabled ? 'queued' : 'held'])
        await client.query('commit')
        return { test: false, inserted: true, duplicate: false, registrations: 1, effects: 1, event_code: normalized.route.eventCode, city: normalized.route.city, chat_id: CHAT_ID, message_thread_id: normalized.route.threadId, delivery_state: mirrorEnabled ? 'queued' : 'held' }
      } catch (error) { await client.query('rollback'); throw error } finally { client.release() }
    },
    async readback(transactionId) {
      const result = await pool.query(`select i.project_id,i.form_id,i.transaction_id,i.test_submission,r.event_code,r.city,r.identity_key,
        o.chat_id::text,o.message_thread_id,o.delivery_state,o.delivery_attempts,o.telegram_message_id,o.payload
        from tilda_inbound_submissions i left join event_registrations r on r.inbound_submission_id=i.id
        left join event_registration_outbox o on o.registration_id=r.id where i.transaction_id=$1`, [transactionId])
      return result.rows
    },
  }
}

module.exports = { PROJECT_ID, CHAT_ID, ROUTES, normalize, piiFreePayload, createTildaIntakeRepository }
