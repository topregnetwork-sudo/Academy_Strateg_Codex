const test = require('node:test')
const assert = require('node:assert/strict')
const { CONTRACT, CONTRACT_SHA256, MESSAGE_VERSION, GROUP_INVITE, createPreviewRuntime, resolveZoomRedirect } = require('../lib/batman-route-contract')

const update = { update_id: 7001, message: { chat: { id: 9001 }, from: { id: 9001, username: 'synthetic_owner' }, text: '/start batman_app_abcdefghijklmnopqrstuvwx' } }
const command = (updateId, text) => ({ update_id: updateId, message: { chat: { id: 9001 }, from: { id: 9001, username: 'synthetic_owner' }, text } })

test('v1.2 contract identity and exact start replay keep one person/journey/card', () => {
  const runtime = createPreviewRuntime(); const first = runtime.process(update); const before = runtime.snapshot(); const second = runtime.process(update)
  assert.equal(CONTRACT, 'AS-BATMAN-ACADEMY-CORE-ROUTE_V1.2')
  assert.equal(CONTRACT_SHA256, 'BDDA934C07A5CD416834F005C158A31D2BB067633C8CEEC3371EEF4A460FD472')
  assert.equal(first.message_kind, 'M01'); assert.equal(second.duplicate, true); assert.deepEqual(runtime.snapshot(), before)
  assert.deepEqual([before.person_count, before.profile_count, before.journey_count, before.visible_card_count], [1, 1, 1, 1])
  assert.equal(before.activated, false)
})
test('accepted RSVP creates M02 and one brief; exact and semantic replay are zero delta', () => {
  const runtime = createPreviewRuntime(); const invitation = runtime.process(update)
  const data = `btm_zoom_rsvp:${invitation.participation_id}:accept:${MESSAGE_VERSION}`
  const callback = { update_id: 7002, callback_query: { id: 'callback-7002', from: { id: 9001 }, message: { chat: { id: 9001 } }, data } }
  const accepted = runtime.process(callback); const beforeExact = runtime.snapshot(); const exact = runtime.process(callback)
  assert.equal(accepted.message_kind, 'M02'); assert.equal(accepted.effect_ids.length, 2); assert.equal(exact.duplicate, true); assert.deepEqual(runtime.snapshot(), beforeExact)
  const semantic = runtime.process({ update_id: 7003, callback_query: { id: 'callback-7003', from: { id: 9001 }, message: { chat: { id: 9001 } }, data } })
  assert.equal(semantic.semantic_replay, true); assert.deepEqual(runtime.snapshot(), beforeExact)
})
test('early ready command is rejected with next step and creates no activation objects', () => {
  const runtime = createPreviewRuntime(); runtime.process(update)
  const result = runtime.process(command(7010, '  готов   работать ')); const snapshot = runtime.snapshot()
  assert.equal(result.message_kind, 'READY_TO_WORK_REJECTED_EARLY'); assert.equal(result.next_step, 'WAIT_FOR_STRATEG_PLUS_GROUP_INVITE')
  assert.equal(result.group_invite, GROUP_INVITE); assert.equal(snapshot.activation_count, 0); assert.equal(snapshot.btm_id_count, 0)
  assert.equal(snapshot.referral_link_count, 0); assert.equal(snapshot.cabinet_grant_count, 0); assert.equal(snapshot.visible_card_count, 1)
})

test('Strateg Plus gate uses WAITING_VALUE and activation atomically returns one id, two purposes and private cabinet', () => {
  const runtime = createPreviewRuntime(); runtime.process(update)
  const group = runtime.issueStrategPlusInvite('9001'); const activated = runtime.process(command(7020, 'ГОТОВ РАБОТАТЬ')); const snapshot = runtime.snapshot()
  assert.equal(group.group_title, 'Стратег Плюс'); assert.equal(group.protected_binding, GROUP_INVITE)
  assert.equal(activated.message_kind, 'BATMAN_ACTIVATED'); assert.match(activated.btm_id, /^BTM_[A-F0-9]{20}$/)
  assert.equal(activated.owner_link.purpose, 'owner_invite'); assert.equal(activated.owner_link.capability, 'business_test_main')
  assert.equal(activated.team_link.purpose, 'batman_invite'); assert.equal(activated.team_link.capability, 'hr_invite')
  assert.notEqual(activated.owner_link.link_id, activated.team_link.link_id); assert.equal(activated.owner_link.url, GROUP_INVITE); assert.equal(activated.team_link.url, GROUP_INVITE)
  assert.deepEqual(activated.cabinet_access.visible_sections, ['personal_links', 'events', 'copy_tools', 'basic_stats'])
  assert.deepEqual(activated.cabinet_access.hidden_sections, ['owner_records', 'owner_contacts', 'all_batman_database'])
  assert.equal(activated.cabinet_access.public_url_contains_pii, false); assert.doesNotMatch(activated.cabinet_access.session_url, /9001|BTM_/)
  assert.deepEqual([snapshot.activation_count, snapshot.btm_id_count, snapshot.referral_link_count, snapshot.cabinet_grant_count, snapshot.visible_card_count], [1, 1, 2, 1, 1])
})

test('exact full replay and aliases return the same objects with zero growth', () => {
  const runtime = createPreviewRuntime(); runtime.process(update); runtime.issueStrategPlusInvite('9001')
  const ready = command(7030, 'ГОТОВ РАБОТАТЬ'); const first = runtime.process(ready); const beforeExact = runtime.snapshot(); const exact = runtime.process(ready)
  assert.equal(exact.duplicate, true); assert.equal(exact.btm_id, first.btm_id); assert.deepEqual(runtime.snapshot(), beforeExact)
  for (const [index, alias] of ['Бэтмен', 'бетмен', 'Команда', 'Личный кабинет'].entries()) {
    const replay = runtime.process(command(7031 + index, alias))
    assert.equal(replay.semantic_replay, true); assert.equal(replay.btm_id, first.btm_id)
    assert.equal(replay.owner_link.link_id, first.owner_link.link_id); assert.equal(replay.team_link.link_id, first.team_link.link_id)
    assert.equal(replay.cabinet_access.grant_id, first.cabinet_access.grant_id); assert.deepEqual(runtime.snapshot(), beforeExact)
  }
})

test('group issue replay is zero and a real protected URL is rejected in preview', () => {
  const runtime = createPreviewRuntime(); runtime.process(update); runtime.issueStrategPlusInvite('9001'); const before = runtime.snapshot()
  assert.equal(runtime.issueStrategPlusInvite('9001').semantic_replay, true); assert.deepEqual(runtime.snapshot(), before)
  assert.throws(() => runtime.issueStrategPlusInvite('9001', { protectedBinding: 'https://example.invalid/private' }), /protected_group_link_must_not_be_supplied/)
})

test('redirect requires valid click and never activates or issues business test', () => {
  const runtime = createPreviewRuntime(); const result = runtime.process(update)
  const redirect = resolveZoomRedirect({ journey: result.journey, valid: true, zoomUrl: 'https://zoom.example/meeting' })
  assert.equal(redirect.status, 302); assert.equal(redirect.location, 'https://zoom.example/meeting')
  assert.equal(result.journey.btm_id, null); assert.equal(result.journey.business_test_main, false)
  assert.equal(resolveZoomRedirect({ journey: result.journey, valid: false, zoomUrl: 'https://zoom.example/meeting' }).status, 404)
})
