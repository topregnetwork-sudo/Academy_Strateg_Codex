const test = require('node:test')
const assert = require('node:assert/strict')
const { TEST_TEXT, assertSyntheticUpdate, syntheticRoundTrip } = require('../lib/batman-telegram-synthetic')

test('accepts only the exact synthetic owner account', () => {
  const update = { update_id: 2026092301, message: { chat: { id: 123 }, from: { id: 123 }, text: '/start synthetic' } }
  assert.deepEqual(assertSyntheticUpdate(update, '123'), { updateId: 2026092301, chatId: '123', userId: '123' })
  assert.throws(() => assertSyntheticUpdate(update, '456'), /synthetic_recipient_mismatch/)
})

test('delivers one visibly marked test reply and records Telegram message id', async () => {
  const transitions = []
  const repository = {
    async ingestAndQueue() {
      return { inserted: true, outbox: { id: 'outbox-1', delivery_state: 'queued' } }
    },
    async leaseOne() { return { id: 'outbox-1', payload: { text: TEST_TEXT } } },
    async markDelivered(job, messageId, campaignId) { transitions.push({ job, messageId, campaignId }) },
    async markFailed() { throw new Error('must_not_fail') },
  }
  const result = await syntheticRoundTrip({
    repository,
    botKey: 'synthetic',
    botToken: 'token-not-logged',
    expectedChatId: '123',
    campaignId: 'batman_synthetic_round_trip_20260923_v1',
    update: { update_id: 2026092301, message: { chat: { id: 123 }, from: { id: 123 } } },
    fetchImpl: async (_url, options) => {
      const payload = JSON.parse(options.body)
      assert.equal(payload.chat_id, '123')
      assert.match(payload.text, /^ТЕСТ/)
      return new Response(JSON.stringify({ ok: true, result: { message_id: 777, chat: { id: 123 } } }), {
        status: 200, headers: { 'content-type': 'application/json' },
      })
    },
  })
  assert.deepEqual(result, { state: 'delivered', duplicate: false, messageId: 777 })
  assert.equal(transitions.length, 1)
  assert.equal(transitions[0].messageId, 777)
})

test('idempotent retry does not call Telegram twice', async () => {
  let sends = 0
  const repository = {
    async ingestAndQueue() {
      return { inserted: false, outbox: { id: 'outbox-1', delivery_state: 'delivered', telegram_message_id: 777 } }
    },
  }
  const result = await syntheticRoundTrip({
    repository,
    botKey: 'synthetic', botToken: 'unused', expectedChatId: '123', campaignId: 'campaign', update: {},
    fetchImpl: async () => { sends += 1 },
  })
  assert.deepEqual(result, { state: 'delivered', duplicate: true, messageId: 777 })
  assert.equal(sends, 0)
})
