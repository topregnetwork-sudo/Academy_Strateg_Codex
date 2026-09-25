const test = require('node:test')
const assert = require('node:assert/strict')
const { defaultRegistry, validateRegistry, resolveRoute, normalize, normalizeTildaWebhookPayload, telegramPayload } = require('../lib/tilda-event-intake')
const { runTildaBackfill } = require('../lib/tilda-backfill')

function enabledRegistry() {
  return { ...defaultRegistry, global_enabled: true, telegram_sender: { ...defaultRegistry.telegram_sender, membership_and_send_permission_verified: true }, events: defaultRegistry.events.map((event) => ({ ...event, enabled: true })) }
}

test('registry contains two disabled initial entries with complete routing fields', () => {
  const registry = validateRegistry(defaultRegistry)
  assert.equal(registry.global_enabled, false)
  assert.deepEqual(registry.telegram_sender, { bot_key: 'batman_strateg_bot', allowed_methods: ['sendMessage'], inbound_updates_enabled: false, membership_and_send_permission_verified: true })
  assert.deepEqual(registry.events.map((event) => [event.city_id, event.form_id, event.message_thread_id, event.enabled]), [
    ['chelyabinsk', '4215769301', 2, false], ['minsk', '3744984501', 4, false],
  ])
})

test('global and per-event flags plus active window fail closed', () => {
  const input = { project_id: '8607529', form_id: '4215769301' }
  assert.equal(resolveRoute(input, defaultRegistry, new Date('2026-09-28T12:00:00+03:00')).routable, false)
  assert.equal(resolveRoute(input, enabledRegistry(), new Date('2026-09-28T12:00:00+03:00')).routable, true)
  assert.equal(resolveRoute(input, enabledRegistry(), new Date('2027-01-01T00:00:00Z')).routable, false)
})

test('unknown form is rejected and enabled route resolves by data', () => {
  const registry = enabledRegistry()
  assert.equal(normalize({ project_id: '8607529', form_id: '4215769301', transaction_id: 'c1', identity_key: 'person-c1' }, registry, new Date('2026-09-28T12:00:00+03:00')).route.message_thread_id, 2)
  assert.equal(normalize({ project_id: '8607529', form_id: '3744984501', transaction_id: 'm1', identity_key: 'person-m1' }, registry, new Date('2026-09-28T12:00:00+03:00')).route.message_thread_id, 4)
  assert.throws(() => resolveRoute({ project_id: '8607529', form_id: 'wrong' }, registry), /form_not_allowed/)
})

test('telegram payload contains only approved registration fields and route metadata', () => {
  const payload = telegramPayload(enabledRegistry().events[0], { Name: 'Тест', Phone: '+70000000000', Email: 'test@example.org', Checkbox: 'yes', COOKIES: 'private' })
  assert.deepEqual(Object.keys(payload).sort(), ['campaign_id','city_id','event_id','route_version','text'])
  assert.match(payload.text, /Имя: Тест/)
  assert.match(payload.text, /Телефон: \+70000000000/)
  assert.match(payload.text, /Email: test@example.org/)
  assert.equal(payload.text.includes('COOKIES'), false)
})

test('normalizes real Tilda webhook field names without retaining raw identity in identity key', () => {
  const normalized = normalizeTildaWebhookPayload({ formid: 'form4215769301', tranid: '467251:8442970', Email: 'test@example.org' })
  assert.equal(normalized.project_id, '8607529')
  assert.equal(normalized.form_id, '4215769301')
  assert.equal(normalized.transaction_id, '467251:8442970')
  assert.match(normalized.identity_key, /^tilda:[a-f0-9]{64}$/)
  assert.equal(normalized.identity_key.includes('@'), false)
})

test('one-shot backfill is bounded and reports idempotent delivery evidence', async () => {
  let ingests = 0
  const result = await runTildaBackfill({
    rows: [{ formid: 'form4215769301', tranid: 'lead:1' }, { formid: 'form3744984501', tranid: 'lead:2' }],
    repository: { ingest: async () => ({ inserted: ++ingests === 1, duplicate: ingests !== 1, idempotency_key: `k${ingests}` }) },
    outbox: {}, botToken: 'secret',
    deliver: async ({ idempotencyKey }) => ({ state: 'delivered', messageId: idempotencyKey === 'k1' ? 101 : 102, duplicate: idempotencyKey !== 'k1' }),
  })
  assert.equal(result.rows, 2)
  assert.equal(result.delivered, 2)
  assert.deepEqual(result.evidence.map((item) => [item.form_id, item.message_id]), [['4215769301',101],['3744984501',102]])
  await assert.rejects(() => runTildaBackfill({ rows: [], repository: {}, outbox: {}, deliver: async () => {} }), /backfill_row_count_invalid/)
})
