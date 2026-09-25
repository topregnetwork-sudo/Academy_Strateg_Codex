const crypto = require('node:crypto')
const defaultRegistry = require('../config/tilda-event-routing.v1.json')

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`
  return JSON.stringify(value)
}
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex') }

function normalizeTildaWebhookPayload(input) {
  const formId = String(input?.form_id || input?.formid || '').replace(/^form/i, '').trim()
  const transactionId = String(input?.transaction_id || input?.tranid || '').trim()
  const identitySource = String(input?.identity_key || input?.Email || input?.email || input?.Phone || input?.phone || transactionId).trim().toLowerCase()
  return { ...input, project_id: String(input?.project_id || '8607529'), form_id: formId, transaction_id: transactionId, identity_key: input?.identity_key || `tilda:${sha256(identitySource)}` }
}

function validateRegistry(registry) {
  if (!registry || typeof registry.global_enabled !== 'boolean' || !Array.isArray(registry.events)) throw new Error('routing_registry_invalid')
  const sender = registry.telegram_sender
  if (!sender || sender.bot_key !== 'batman_strateg_bot' || JSON.stringify(sender.allowed_methods) !== JSON.stringify(['sendMessage']) || sender.inbound_updates_enabled !== false || typeof sender.membership_and_send_permission_verified !== 'boolean') throw new Error('routing_telegram_sender_invalid')
  const keys = new Set()
  for (const event of registry.events) {
    for (const field of ['event_id','city_id','city_name','tilda_project_id','form_id','campaign_id','telegram_chat_id','active_from','active_to']) {
      if (!String(event[field] || '').trim()) throw new Error(`routing_${field}_invalid`)
    }
    if (!Number.isSafeInteger(event.message_thread_id) || !Number.isSafeInteger(event.version) || typeof event.enabled !== 'boolean') throw new Error('routing_version_or_flags_invalid')
    const key = `${event.tilda_project_id}:${event.form_id}`
    if (keys.has(key)) throw new Error('routing_duplicate_project_form')
    keys.add(key)
  }
  return registry
}

function resolveRoute(input, registry = defaultRegistry, now = new Date()) {
  validateRegistry(registry)
  const projectId = String(input?.project_id || '').trim()
  const formId = String(input?.form_id || '').trim()
  const route = registry.events.find((event) => event.tilda_project_id === projectId && event.form_id === formId)
  if (!route) throw new Error('form_not_allowed')
  const active = now >= new Date(route.active_from) && now <= new Date(route.active_to)
  return { ...route, registry_version: registry.registry_version, telegram_sender: registry.telegram_sender, routable: registry.global_enabled && route.enabled && active && registry.telegram_sender.membership_and_send_permission_verified, active }
}

function normalize(input, registry = defaultRegistry, now = new Date()) {
  const transactionId = String(input?.transaction_id || '').trim()
  const identityKey = String(input?.identity_key || '').trim()
  const test = input?.test === true || String(input?.test || '').toLowerCase() === 'test'
  const route = resolveRoute(input, registry, now)
  if (!transactionId || transactionId.length > 160) throw new Error('transaction_id_invalid')
  if (!test && (!identityKey || identityKey.length > 160)) throw new Error('identity_key_invalid')
  if (!test && !route.routable) throw new Error('event_route_disabled')
  return { projectId: route.tilda_project_id, formId: route.form_id, transactionId, identityKey, test, route }
}

function piiFreePayload(route) {
  return { text: `Новая регистрация на мероприятие · ${route.city_name}`, event_id: route.event_id, city_id: route.city_id, campaign_id: route.campaign_id, route_version: route.version }
}

function createTildaIntakeRepository(pool, registry = defaultRegistry) {
  return {
    async ingest(input, { mirrorEnabled = false, now = new Date() } = {}) {
      input = normalizeTildaWebhookPayload(input)
      const normalized = normalize(input, registry, now)
      if (normalized.test) return { test: true, inserted: false, registrations: 0, effects: 0 }
      const client = await pool.connect()
      try {
        await client.query('begin')
        const inbound = await client.query(`insert into tilda_inbound_submissions(id,project_id,form_id,transaction_id,payload_fingerprint,payload)
          values ($1,$2,$3,$4,$5,$6::jsonb) on conflict (project_id,form_id,transaction_id) do nothing returning id`,
          [crypto.randomUUID(), normalized.projectId, normalized.formId, normalized.transactionId, sha256(stableJson(input)), JSON.stringify(input)])
        if (!inbound.rowCount) { await client.query('rollback'); return { test: false, inserted: false, duplicate: true, registrations: 0, effects: 0 } }
        const registrationId = crypto.randomUUID()
        const registration = await client.query(`insert into event_registrations(id,inbound_submission_id,event_code,city,identity_key,campaign_id,route_version)
          values ($1,$2,$3,$4,$5,$6,$7) on conflict (event_code,identity_key) do nothing returning id`,
          [registrationId, inbound.rows[0].id, normalized.route.event_id, normalized.route.city_name, normalized.identityKey, normalized.route.campaign_id, normalized.route.version])
        if (!registration.rowCount) { await client.query('rollback'); return { test: false, inserted: false, duplicate: true, registrations: 0, effects: 0 } }
        const effectKey = `tilda:v1:${normalized.projectId}:${normalized.formId}:${normalized.transactionId}:registration:telegram_forum_mirror:v${normalized.route.version}`
        await client.query(`insert into event_registration_outbox(id,registration_id,chat_id,message_thread_id,payload,idempotency_key,delivery_state)
          values ($1,$2,$3,$4,$5::jsonb,$6,$7)`,
          [crypto.randomUUID(), registrationId, normalized.route.telegram_chat_id, normalized.route.message_thread_id, JSON.stringify(piiFreePayload(normalized.route)), effectKey, mirrorEnabled ? 'queued' : 'held'])
        await client.query('commit')
        return { test: false, inserted: true, duplicate: false, registrations: 1, effects: 1, event_id: normalized.route.event_id, city_id: normalized.route.city_id, campaign_id: normalized.route.campaign_id, chat_id: normalized.route.telegram_chat_id, message_thread_id: normalized.route.message_thread_id, delivery_state: mirrorEnabled ? 'queued' : 'held' }
      } catch (error) { await client.query('rollback'); throw error } finally { client.release() }
    },
    async readback(transactionId) {
      const result = await pool.query(`select i.project_id,i.form_id,i.transaction_id,i.test_submission,r.event_code,r.city,r.identity_key,r.campaign_id,r.route_version,
        o.chat_id::text,o.message_thread_id,o.delivery_state,o.delivery_attempts,o.telegram_message_id,o.payload
        from tilda_inbound_submissions i left join event_registrations r on r.inbound_submission_id=i.id
        left join event_registration_outbox o on o.registration_id=r.id where i.transaction_id=$1`, [transactionId])
      return result.rows
    },
  }
}

module.exports = { defaultRegistry, validateRegistry, resolveRoute, normalize, normalizeTildaWebhookPayload, piiFreePayload, createTildaIntakeRepository }
