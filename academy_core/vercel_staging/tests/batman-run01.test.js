const test = require('node:test')
const assert = require('node:assert/strict')
const {
  PARTICIPANT_TEXT, CONTROL_TEXT, stableUuid, boundedRunId, exactOwnerUpdate, runOwnerOnlyRun01,
} = require('../lib/batman-run01')

const update = {
  update_id: 2026092801,
  message: { chat: { id: 123 }, from: { id: 123, username: 'owner_preview' }, text: '/start batman_app_abcdefghijklmnopqrstuvwx' },
}

test('RUN-01 validates exact owner and opaque start payload', () => {
  assert.equal(boundedRunId('BATMAN_OWNER_RUN01_20260928_A'), 'BATMAN_OWNER_RUN01_20260928_A')
  assert.throws(() => boundedRunId('bad'), /run01_id_invalid/)
  assert.equal(exactOwnerUpdate(update, '123').userId, '123')
  assert.throws(() => exactOwnerUpdate(update, '456'), /run01_owner_mismatch/)
  assert.throws(() => exactOwnerUpdate({ ...update, message: { ...update.message, text: '/start wrong' } }, '123'), /run01_start_payload_invalid/)
})
test('stable ids and test messages do not contain unmarked live claims', () => {
  assert.equal(stableUuid('profile', 'same'), stableUuid('profile', 'same'))
  assert.match(stableUuid('profile', 'same'), /^[0-9a-f-]{36}$/)
  assert.match(PARTICIPANT_TEXT, /^ТЕСТ/)
  assert.match(CONTROL_TEXT, /^ТЕСТ/)
  assert.match(PARTICIPANT_TEXT, /production.*не изменялись/)
})
test('first RUN-01 sends two owner-only messages and replay sends zero', async () => {
  let delivered = false
  let sends = 0
  const repository = {
    async prepare() {
      return {
        runId: 'BATMAN_OWNER_RUN01_20260928_A', profileId: 'p', journeyId: 'j',
        created: delivered ? { profile: 0, journey: 0, telegram_update: 0, events: 0, outbox: 0 } : { profile: 1, journey: 1, telegram_update: 1, events: 5, outbox: 2 },
      }
    },
    async queued() {
      return delivered
        ? [{ id: '1', delivery_state: 'delivered', telegram_message_id: 701 }, { id: '2', delivery_state: 'delivered', telegram_message_id: 702 }]
        : [{ id: '1', delivery_state: 'queued' }, { id: '2', delivery_state: 'queued' }]
    },
    async lease(id) { return { id, payload: { text: id === '1' ? PARTICIPANT_TEXT : CONTROL_TEXT }, idempotency_key: `BATMAN_OWNER_RUN01_20260928_A:${id}` } },
    async delivered() {}, async failed() { throw new Error('must_not_fail') },
    async readback() { return { profiles: 1, journeys: 1, identities: 1, visible_cards: 1, domain_events: 5, outbox_total: 2, outbox_delivered: 2, activations: 0, referral_links: 0 } },
  }
  const fetchImpl = async (_url, options) => {
    sends += 1
    const payload = JSON.parse(options.body)
    assert.equal(payload.chat_id, '123')
    return new Response(JSON.stringify({ ok: true, result: { message_id: 700 + sends, chat: { id: 123 } } }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  const first = await runOwnerOnlyRun01({ repository, botKey: 'preview', botToken: 'hidden', expectedChatId: '123', runId: 'BATMAN_OWNER_RUN01_20260928_A', update, fetchImpl })
  assert.deepEqual(first.message_ids, [701, 702])
  assert.equal(first.duplicate, false)
  delivered = true
  const replay = await runOwnerOnlyRun01({ repository, botKey: 'preview', botToken: 'hidden', expectedChatId: '123', runId: 'BATMAN_OWNER_RUN01_20260928_A', update, fetchImpl })
  assert.deepEqual(replay.message_ids, [701, 702])
  assert.equal(replay.duplicate, true)
  assert.equal(sends, 2)
  assert.equal(replay.readback.activations, 0)
  assert.equal(replay.readback.referral_links, 0)
})
