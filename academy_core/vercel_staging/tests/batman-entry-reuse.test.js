const test = require('node:test')
const assert = require('node:assert/strict')
const { createMemoryRepository, opaqueHash, resolveBatmanEntry } = require('../lib/batman-entry-reuse')

const base = { application_code: 'abcdefghijklmnopqrstuvwx', full_name: 'Новый контакт', city: 'Минск', telegram_username: '@SameUser', phone: '+375 29 000-00-00', campaign_id: 'preview' }

test('new external landing contact creates one profile, one journey and Batman bot handoff', async () => {
  const repository = createMemoryRepository()
  const result = await resolveBatmanEntry(repository, { ...base, entry_route: 'new_batman', source_id: 'batman_landing' })
  assert.equal(result.reused, false)
  assert.match(result.telegram_url, /batman_strateg_bot\?start=batman_app_/)
  assert.equal(repository.snapshot().profiles.length, 1)
  assert.equal(repository.snapshot().journeys.length, 1)
  assert.equal(result.operator_card.profile_id, result.profile_id)
  assert.equal(result.operator_card.journey_id, result.journey_id)
})
test('Trainer bridge reuses existing profile and journey instead of creating parallel card', async () => {
  const profile = { id: 'profile-1', application_code_hash: opaqueHash('old-code'), full_name: 'Резерв', city: 'Минск', telegram_username: 'sameuser', phone: '375290000000', source_id: 'trainer_reserve' }
  const journey = { id: 'journey-1', profile_id: 'profile-1', entry_route: 'trainer_reserve', trainer_candidate_id: '1551', current_stage: 'telegram_identity_linked', next_action: 'show_active_zoom_slots' }
  const repository = createMemoryRepository({ profiles: [profile], journeys: [journey] })
  const result = await resolveBatmanEntry(repository, { ...base, entry_route: 'trainer_reserve', trainer_candidate_id: '1551', source_id: 'trainer_reserve' })
  assert.equal(result.reused, true)
  assert.equal(result.profile_id, 'profile-1')
  assert.equal(result.journey_id, 'journey-1')
  assert.equal(repository.snapshot().profiles.length, 1)
  assert.equal(repository.snapshot().journeys.length, 1)
  assert.equal(result.operator_card.profile_id, 'profile-1')
})

test('repeat landing submission resolves to the same card by normalized Telegram identity', async () => {
  const repository = createMemoryRepository()
  const first = await resolveBatmanEntry(repository, { ...base, entry_route: 'new_batman' })
  const second = await resolveBatmanEntry(repository, { ...base, application_code: 'zyxwvutsrqponmlkjihgfedc', entry_route: 'new_batman' })
  assert.equal(second.reused, true)
  assert.equal(second.profile_id, first.profile_id)
  assert.equal(second.journey_id, first.journey_id)
  assert.equal(repository.snapshot().profiles.length, 1)
  assert.equal(repository.snapshot().journeys.length, 1)
})
