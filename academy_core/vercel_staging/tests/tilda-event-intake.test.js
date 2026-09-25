const test = require('node:test')
const assert = require('node:assert/strict')
const { defaultRegistry, validateRegistry, resolveRoute, normalize, piiFreePayload } = require('../lib/tilda-event-intake')

function enabledRegistry() {
  return { ...defaultRegistry, global_enabled: true, events: defaultRegistry.events.map((event) => ({ ...event, enabled: true })) }
}

test('registry contains two disabled initial entries with complete routing fields', () => {
  const registry = validateRegistry(defaultRegistry)
  assert.equal(registry.global_enabled, false)
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

test('telegram payload contains route metadata and no submitted identity', () => {
  const payload = piiFreePayload(enabledRegistry().events[0])
  assert.deepEqual(Object.keys(payload).sort(), ['campaign_id','city_id','event_id','route_version','text'])
  assert.equal(JSON.stringify(payload).includes('person'), false)
})
