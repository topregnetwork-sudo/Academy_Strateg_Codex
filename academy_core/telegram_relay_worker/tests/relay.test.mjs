import test from 'node:test'
import assert from 'node:assert/strict'
import worker, { allowed, equal } from '../src/index.mjs'

test('kill switch is closed by default', async () => {
  const result = await worker.fetch(new Request('https://relay.test/v1/send-message', { method: 'POST' }), { RELAY_ENABLED: 'false', ALLOWED_DESTINATIONS: '1:0' })
  assert.equal(result.status, 404)
})

test('destination allowlist is exact', () => {
  const env = { ALLOWED_DESTINATIONS: '6100981026:0,-1004404302282:2,-1004404302282:4' }
  assert.equal(allowed(env, '6100981026', 0), true)
  assert.equal(allowed(env, '-1004404302282', 4), true)
  assert.equal(allowed(env, '-1004404302282', 3), false)
  assert.equal(equal('a'.repeat(64), 'a'.repeat(64)), true)
})
