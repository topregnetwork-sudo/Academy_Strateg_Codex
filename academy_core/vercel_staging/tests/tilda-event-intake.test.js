const test = require('node:test')
const assert = require('node:assert/strict')
const { PROJECT_ID, ROUTES, normalize, piiFreePayload } = require('../lib/tilda-event-intake')

test('allowlists the exact project and two forms', () => {
  assert.equal(normalize({ project_id: PROJECT_ID, form_id: '4215769301', transaction_id: 'c1', identity_key: 'person-c1' }).route.threadId, 2)
  assert.equal(normalize({ project_id: PROJECT_ID, form_id: '3744984501', transaction_id: 'm1', identity_key: 'person-m1' }).route.threadId, 4)
  assert.throws(() => normalize({ project_id: PROJECT_ID, form_id: 'wrong', transaction_id: 'x', identity_key: 'x' }), /form_not_allowed/)
})

test('test marker needs no identity', () => {
  assert.equal(normalize({ project_id: PROJECT_ID, form_id: '4215769301', transaction_id: 'test-1', test: 'test' }).test, true)
})

test('telegram payload and topic mapping contain no identity', () => {
  assert.deepEqual([ROUTES['4215769301'].threadId, ROUTES['3744984501'].threadId], [2, 4])
  assert.equal(JSON.stringify(piiFreePayload(ROUTES['4215769301'])).includes('person'), false)
  assert.equal(JSON.stringify(piiFreePayload(ROUTES['3744984501'])).includes('person'), false)
})
