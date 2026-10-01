const { createHash, randomUUID } = require('node:crypto')

function normalizedUsername(value) {
  return String(value || '').trim().replace(/^@/, '').toLocaleLowerCase('ru-RU') || null
}

function normalizedPhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  return digits.length >= 10 ? digits : null
}

function opaqueHash(value) {
  return createHash('sha256').update(String(value)).digest('hex')
}

function publicCard(profile, journey) {
  return {
    profile_id: profile.id,
    journey_id: journey.id,
    full_name: profile.full_name,
    city: profile.city,
    telegram_username: profile.telegram_username,
    entry_route: journey.entry_route,
    trainer_candidate_id: journey.trainer_candidate_id,
    current_stage: journey.current_stage,
    next_action: journey.next_action,
  }
}

async function resolveBatmanEntry(repository, input) {
  const entryRoute = input.entry_route === 'trainer_reserve' ? 'trainer_reserve' : 'new_batman'
  const identity = {
    trainerCandidateId: entryRoute === 'trainer_reserve' ? String(input.trainer_candidate_id || '').trim() || null : null,
    telegramUsername: normalizedUsername(input.telegram_username),
    phone: normalizedPhone(input.phone),
    applicationCodeHash: opaqueHash(input.application_code),
  }
  let profile = await repository.findProfile(identity)
  let created = false
  if (!profile) {
    profile = await repository.createProfile({
      id: randomUUID(),
      application_code_hash: identity.applicationCodeHash,
      full_name: String(input.full_name || '').trim(),
      city: String(input.city || '').trim(),
      telegram_username: identity.telegramUsername,
      phone: identity.phone,
      source_id: String(input.source_id || entryRoute),
      campaign_id: String(input.campaign_id || ''),
      questionnaire_version: Number(input.questionnaire_version || 1),
      consent_version: String(input.consent_version || 'batman-candidate-v1'),
    })
    created = true
  }
  let journey = await repository.findJourney(profile.id)
  if (!journey) {
    journey = await repository.createJourney({
      id: randomUUID(), profile_id: profile.id, entry_route: entryRoute,
      trainer_candidate_id: identity.trainerCandidateId,
      current_stage: entryRoute === 'trainer_reserve' ? 'telegram_identity_linked' : 'questionnaire_completed',
      next_action: entryRoute === 'trainer_reserve' ? 'show_active_zoom_slots' : 'open_batman_bot',
    })
  }
  return {
    reused: !created,
    profile_id: profile.id,
    journey_id: journey.id,
    telegram_url: `https://t.me/batman_strateg_bot?start=batman_app_${input.application_code}`,
    operator_card: publicCard(profile, journey),
  }
}

function createMemoryRepository(seed = {}) {
  const profiles = [...(seed.profiles || [])]
  const journeys = [...(seed.journeys || [])]
  return {
    async findProfile(identity) {
      const journey = identity.trainerCandidateId && journeys.find(item => item.trainer_candidate_id === identity.trainerCandidateId)
      return (journey && profiles.find(item => item.id === journey.profile_id)) || profiles.find(item =>
        item.application_code_hash === identity.applicationCodeHash ||
        (identity.telegramUsername && normalizedUsername(item.telegram_username) === identity.telegramUsername) ||
        (identity.phone && normalizedPhone(item.phone) === identity.phone)) || null
    },
    async createProfile(value) { profiles.push(value); return value },
    async findJourney(profileId) { return journeys.find(item => item.profile_id === profileId) || null },
    async createJourney(value) { journeys.push(value); return value },
    snapshot() { return { profiles: [...profiles], journeys: [...journeys] } },
  }
}

module.exports = { normalizedUsername, normalizedPhone, opaqueHash, publicCard, resolveBatmanEntry, createMemoryRepository }
