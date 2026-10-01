const { createHash } = require('node:crypto')

const CONTRACT = 'AS-BATMAN-ACADEMY-CORE-ROUTE_V1.2'
const CONTRACT_SHA256 = 'BDDA934C07A5CD416834F005C158A31D2BB067633C8CEEC3371EEF4A460FD472'
const MESSAGE_VERSION = 'batman_zoom_common_v1.0'
const GROUP_INVITE = 'WAITING_VALUE'
const LINK_VERSION = 'batman_referral_v1.2'

function hash(value) { return createHash('sha256').update(String(value)).digest('hex') }
function opaque(prefix, value) { return `${prefix}_${hash(value).slice(0, 20)}` }
function normalizeCommand(value) { return String(value || '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('ru-RU') }

function normalizeUpdate(update) {
  const updateId = Number(update?.update_id)
  const message = update?.message || update?.callback_query?.message || {}
  const from = update?.message?.from || update?.callback_query?.from || {}
  const chatId = String(message?.chat?.id || '')
  const telegramUserId = String(from?.id || '')
  const text = String(update?.message?.text || '')
  const callbackId = String(update?.callback_query?.id || '')
  const callbackData = String(update?.callback_query?.data || '')
  if (!Number.isSafeInteger(updateId) || !chatId || !telegramUserId) throw new Error('telegram_update_invalid')
  return { updateId, chatId, telegramUserId, username: String(from?.username || ''), text, callbackId, callbackData }
}

function createPreviewRuntime() {
  const state = {
    updates: new Map(), identities: new Map(), journeys: new Map(), participations: new Map(),
    effects: new Map(), semanticResults: new Map(), activations: new Map(), referralLinks: new Map(),
    cabinetGrants: new Map(), events: [], visibleCards: new Set(),
  }

  function addEvent(key, eventType, fields = {}) {
    if (state.semanticResults.has(`event:${key}`)) return state.semanticResults.get(`event:${key}`)
    const event = { event_id: opaque('event', key), event_type: eventType, idempotency_key: key, ...fields }
    state.events.push(event)
    state.semanticResults.set(`event:${key}`, event)
    return event
  }

  function addEffect(key, value) {
    if (state.effects.has(key)) return state.effects.get(key)
    const effect = { effect_key: key, message_id: `preview_${hash(key).slice(0, 12)}`, delivery_state: 'preview_only', ...value }
    state.effects.set(key, effect)
    return effect
  }

  function ensureIdentity(telegramUserId) {
    let identity = state.identities.get(telegramUserId)
    if (identity) return identity
    const suffix = hash(telegramUserId).slice(0, 16)
    identity = { person_id: `person_${suffix}`, profile_id: `profile_${suffix}`, journey_id: `journey_${suffix}` }
    state.identities.set(telegramUserId, identity)
    state.journeys.set(identity.journey_id, {
      ...identity, current_stage: 'questionnaire_completed', group_invite_issued: false,
      btm_id: null, ref_code: null, activated: false, business_test_main: false,
    })
    state.visibleCards.add(identity.journey_id)
    addEvent(`identity:${telegramUserId}`, 'identity_resolved', identity)
    return identity
  }

  function activationResult(identity, journey) {
    const links = [...state.referralLinks.values()].filter((item) => item.btm_id === journey.btm_id)
    return {
      message_kind: 'BATMAN_ACTIVATED', outbound: false, identity, journey,
      btm_id: journey.btm_id, ref_code: journey.ref_code,
      owner_link: links.find((item) => item.purpose === 'owner_invite'),
      team_link: links.find((item) => item.purpose === 'batman_invite'),
      cabinet_access: state.cabinetGrants.get(identity.journey_id),
      group_invite: GROUP_INVITE,
    }
  }

  function activate(identity, journey) {
    const activationKey = `activation:${journey.journey_id}:participant_command:v1.2`
    if (state.activations.has(activationKey)) return { ...state.activations.get(activationKey), semantic_replay: true }
    if (!journey.group_invite_issued) {
      const rejected = {
        message_kind: 'READY_TO_WORK_REJECTED_EARLY', outbound: false, activated: false,
        next_step: 'WAIT_FOR_STRATEG_PLUS_GROUP_INVITE', group_invite: GROUP_INVITE,
      }
      addEvent(`ready_early:${journey.journey_id}`, 'ready_to_work_rejected_early', { journey_id: journey.journey_id })
      return rejected
    }

    // Build the whole activation result before publishing any state: local preview of one atomic commit.
    const btmId = opaque('BTM', journey.journey_id).toUpperCase()
    const refCode = opaque('ref', `${journey.journey_id}:v1.2`)
    const ownerLink = {
      link_id: opaque('link', `${btmId}:owner_invite:${LINK_VERSION}`), purpose: 'owner_invite',
      capability: 'business_test_main', version: LINK_VERSION, url: 'WAITING_VALUE', btm_id: btmId,
    }
    const teamLink = {
      link_id: opaque('link', `${btmId}:batman_invite:${LINK_VERSION}`), purpose: 'batman_invite',
      capability: 'hr_invite', version: LINK_VERSION, url: 'WAITING_VALUE', btm_id: btmId,
    }
    const cabinetAccess = {
      grant_id: opaque('grant', `${journey.journey_id}:cabinet:v1.2`),
      session_url: `preview://batman-cabinet/session/${opaque('session', journey.journey_id)}`,
      visible_sections: ['personal_links', 'events', 'copy_tools', 'basic_stats'],
      hidden_sections: ['owner_records', 'owner_contacts', 'all_batman_database'],
      public_url_contains_pii: false,
    }
    const committedJourney = { ...journey, current_stage: 'cabinet_access_issued', activated: true, btm_id: btmId, ref_code: refCode }
    state.journeys.set(journey.journey_id, committedJourney)
    Object.assign(journey, committedJourney)
    state.referralLinks.set(ownerLink.link_id, ownerLink)
    state.referralLinks.set(teamLink.link_id, teamLink)
    state.cabinetGrants.set(journey.journey_id, cabinetAccess)
    addEvent(`ready:${journey.journey_id}`, 'ready_to_work_received', { journey_id: journey.journey_id })
    addEvent(activationKey, 'batman_activated', { journey_id: journey.journey_id, decided_by: 'participant_command', policy_version: CONTRACT })
    addEvent(`btm:${btmId}`, 'btm_id_issued', { journey_id: journey.journey_id })
    addEvent(`links:${btmId}:${LINK_VERSION}`, 'referral_links_issued', { journey_id: journey.journey_id })
    addEvent(`cabinet:${journey.journey_id}:v1.2`, 'batman_cabinet_access_issued', { journey_id: journey.journey_id })
    const result = activationResult(identity, journey)
    state.activations.set(activationKey, result)
    return result
  }

  function process(update) {
    const normalized = normalizeUpdate(update)
    const updateKey = `batman_strateg_bot:${normalized.updateId}`
    if (state.updates.has(updateKey)) return { ...state.updates.get(updateKey), duplicate: true }
    const identity = ensureIdentity(normalized.telegramUserId)
    const journey = state.journeys.get(identity.journey_id)
    const isStart = /^\/start(?:\s|$)/i.test(normalized.text)
    const payload = isStart ? normalized.text.trim().split(/\s+/, 2)[1] || '' : ''
    const participationId = `participation_${hash(`${identity.journey_id}:batman_common_zoom`).slice(0, 16)}`
    let participation = state.participations.get(participationId)
    if (!participation) {
      participation = { participation_id: participationId, journey_id: identity.journey_id, status: 'invited' }
      state.participations.set(participationId, participation)
    }
    const effectKey = `${identity.person_id}:${MESSAGE_VERSION}:M01`
    let response = { identity, journey, message_kind: 'noop', outbound: false, group_invite: GROUP_INVITE }
    if (isStart && !state.effects.has(effectKey)) {
      const invitation = addEffect(effectKey, { message_kind: 'M01' })
      addEvent(`bot_started:${updateKey}`, 'bot_started', identity)
      addEvent(`zoom_invited:${identity.journey_id}`, 'zoom_invited', { journey_id: identity.journey_id })
      response = { ...response, message_kind: 'M01', participation_id: participationId, message_version: MESSAGE_VERSION, effect_ids: [invitation.message_id], payload_valid: /^batman_app_[A-Za-z0-9_-]{20,96}$/.test(payload) }
    }
    const callbackMatch = normalized.callbackData.match(/^btm_zoom_rsvp:([^:]+):(accept|decline):(.+)$/)
    if (callbackMatch) {
      const [, callbackParticipationId, action, version] = callbackMatch
      if (version !== MESSAGE_VERSION || callbackParticipationId !== participationId) throw new Error('zoom_rsvp_callback_invalid')
      const semanticKey = `zoom_rsvp:${participationId}:${action}:${MESSAGE_VERSION}`
      const prior = state.semanticResults.get(semanticKey)
      if (prior) response = { ...response, ...prior, semantic_replay: true }
      else if (action === 'accept') {
        participation.status = 'accepted'; journey.current_stage = 'zoom_accepted'
        const confirmation = addEffect(`${identity.person_id}:${MESSAGE_VERSION}:M02`, { message_kind: 'M02' })
        const brief = addEffect(`${identity.person_id}:${MESSAGE_VERSION}:operator_brief`, { message_kind: 'operator_brief' })
        const result = { message_kind: 'M02', effect_ids: [confirmation.message_id, brief.message_id], participation_id: participationId }
        state.semanticResults.set(semanticKey, result)
        addEvent(semanticKey, 'zoom_rsvp_accepted'); addEvent(`${semanticKey}:M02`, 'zoom_confirmation_delivered'); addEvent(`${semanticKey}:brief`, 'operator_brief_delivered')
        response = { ...response, ...result }
      } else {
        participation.status = 'declined'; journey.current_stage = 'zoom_declined'
        const result = { message_kind: 'M01_DECLINED', effect_ids: [], participation_id: participationId }
        state.semanticResults.set(semanticKey, result); addEvent(semanticKey, 'zoom_rsvp_declined')
        response = { ...response, ...result }
      }
    }
    if (['ГОТОВ РАБОТАТЬ', 'БЭТМЕН', 'БЕТМЕН', 'КОМАНДА', 'ЛИЧНЫЙ КАБИНЕТ'].includes(normalizeCommand(normalized.text))) {
      response = { ...response, ...activate(identity, journey) }
    }
    state.updates.set(updateKey, response)
    return response
  }

  function issueStrategPlusInvite(telegramUserId, { protectedBinding = GROUP_INVITE } = {}) {
    const identity = ensureIdentity(String(telegramUserId)); const journey = state.journeys.get(identity.journey_id)
    const key = `group_invite:${journey.journey_id}:strateg_plus:v1.2`
    if (protectedBinding !== GROUP_INVITE) throw new Error('protected_group_link_must_not_be_supplied_to_preview')
    if (state.semanticResults.has(key)) return { ...state.semanticResults.get(key), semantic_replay: true }
    journey.group_invite_issued = true; journey.current_stage = 'ready_to_work_pending'
    const result = { journey_id: journey.journey_id, group_title: 'Стратег Плюс', protected_binding: GROUP_INVITE, issued: true }
    state.semanticResults.set(key, result); addEvent(key, 'group_invite_issued', { journey_id: journey.journey_id })
    return result
  }

  function snapshot() {
    return {
      person_count: state.identities.size, profile_count: state.identities.size, journey_count: state.journeys.size,
      participation_count: state.participations.size, visible_card_count: state.visibleCards.size,
      event_count: state.events.length, effect_count: state.effects.size,
      activation_count: state.activations.size, btm_id_count: new Set([...state.journeys.values()].map((x) => x.btm_id).filter(Boolean)).size,
      referral_link_count: state.referralLinks.size, cabinet_grant_count: state.cabinetGrants.size,
      accepted_count: [...state.participations.values()].filter((x) => x.status === 'accepted').length,
      activated: [...state.journeys.values()].some((x) => x.activated), group_invite: GROUP_INVITE,
    }
  }

  return { process, issueStrategPlusInvite, snapshot }
}

function resolveZoomRedirect({ journey, valid = false, zoomUrl = '' }) {
  if (!valid || !journey || !zoomUrl || journey.btm_id || journey.business_test_main) return { status: 404, event: null }
  return { status: 302, location: zoomUrl, event: { event_type: 'zoom_valid_click', idempotency_key: `valid_click:${journey.journey_id}` } }
}

module.exports = { CONTRACT, CONTRACT_SHA256, MESSAGE_VERSION, GROUP_INVITE, LINK_VERSION, normalizeUpdate, normalizeCommand, createPreviewRuntime, resolveZoomRedirect }
