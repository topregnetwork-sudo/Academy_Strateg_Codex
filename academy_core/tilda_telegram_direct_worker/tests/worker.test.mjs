import test from 'node:test'
import assert from 'node:assert/strict'
import { ROUTES, allowed, equal, normalizePayload, sha256 } from '../src/index.mjs'

test('maps only the two approved forms to isolated topics', () => {
  assert.deepEqual(ROUTES['3744984501'], { city: 'Минск', chatId: '-1004404302282', threadId: 4 })
  assert.deepEqual(ROUTES['4215769301'], { city: 'Челябинск', chatId: '-1004404302282', threadId: 2 })
  assert.equal(ROUTES['4164550001'], undefined)
})

test('normalizes a Tilda form payload without retaining PII', () => {
  const value = normalizePayload('formid=form3744984501&tranid=owner-test-1&Name=Max&Phone=%2B1+23', 'application/x-www-form-urlencoded')
  assert.deepEqual(value, { projectId: '8607529', formId: '3744984501', transactionId: 'owner-test-1', ownerPhone: '123' })
  assert.equal(JSON.stringify(value).includes('secret'), false)
})

test('allowlist and timing-safe comparison fail closed', () => {
  const env = { ALLOWED_DESTINATIONS: '-1004404302282:2,-1004404302282:4' }
  assert.equal(allowed(env, '-1004404302282', 4), true)
  assert.equal(allowed(env, '-1004404302282', 3), false)
  assert.equal(equal('secret', 'secret'), true)
  assert.equal(equal('secret', 'wrong!'), false)
})

test('receipt is a one-way technical hash', async () => {
  const value = await sha256('tilda:v1:8607529:3744984501:owner-test-1')
  assert.match(value, /^[a-f0-9]{64}$/)
  assert.equal(value.includes('owner-test'), false)
})
