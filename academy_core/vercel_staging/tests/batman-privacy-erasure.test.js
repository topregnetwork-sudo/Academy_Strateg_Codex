const test = require('node:test')
const assert = require('node:assert/strict')
const { buildErasurePlan, requestDeadlines } = require('../lib/batman-privacy-erasure')
const { permanentlyDeleteResource } = require('../lib/yandex-disk')

function response(status, body = '') {
  return new Response(status === 204 ? null : body ? JSON.stringify(body) : '', {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

test('computes an internal response target and statutory erasure windows', () => {
  const result = requestDeadlines('2026-09-23T09:00:00.000Z')
  assert.equal(result.responseDueAt, '2026-09-30T09:00:00.000Z')
  assert.equal(result.erasureDueAt, '2026-10-23T09:00:00.000Z')
  assert.equal(result.fallbackDestroyDueAt, '2027-03-23T09:00:00.000Z')
})
test('restricts processing but does not erase before identity verification', () => {
  const plan = buildErasurePlan({
    requestId: 'request-1', profileId: 'profile-1', receivedAt: '2026-09-23T09:00:00.000Z', identityVerified: false,
  })
  assert.equal(plan.state, 'identity_check')
  assert.equal(plan.processingRestricted, true)
  assert.equal(plan.jobs.length, 0)
})
test('erases candidate data while holding only the minimal legal ledger', () => {
  const plan = buildErasurePlan({
    requestId: 'request-2', profileId: 'profile-2', receivedAt: '2026-09-23T09:00:00.000Z', identityVerified: true,
    holds: [{ state: 'active', scope: 'payout', legal_basis: 'unsettled payout', retain_until: '2027-01-01T00:00:00.000Z' }],
  })
  assert.equal(plan.state, 'approved')
  assert.equal(plan.jobs.find((job) => job.target === 'postgres_candidate_pii').state, 'held')
  assert.equal(plan.jobs.find((job) => job.target === 'yandex_candidate_folder').state, 'queued')
  assert.equal(plan.jobs.find((job) => job.target === 'telegram_contact').state, 'queued')
})

test('permanently deletes a Yandex Disk folder and requires missing readback', async () => {
  const calls = []
  const result = await permanentlyDeleteResource('00 Кандидаты/Синтетический', 'synthetic-oauth', async (url, options) => {
    calls.push({ url: String(url), method: options.method })
    return options.method === 'DELETE' ? response(204) : response(404, { error: 'DiskNotFoundError' })
  })
  assert.equal(result.deleted, true)
  assert.equal(result.readbackMissing, true)
  assert.match(calls[0].url, /permanently=true/)
  assert.deepEqual(calls.map((call) => call.method), ['DELETE', 'GET'])
})

test('does not report deletion when Yandex Disk readback still finds the folder', async () => {
  await assert.rejects(() => permanentlyDeleteResource('00 Кандидаты/Синтетический', 'synthetic-oauth', async (_url, options) => {
    return options.method === 'DELETE' ? response(204) : response(200, { type: 'dir' })
  }), /delete_readback_failed/)
})
