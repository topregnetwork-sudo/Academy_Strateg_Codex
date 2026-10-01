const { createHmac, randomUUID } = require('node:crypto')
const { inventoryChats, projectParticipants } = require('./hh-chats')
const { seal } = require('./hh-security')
const { HISTORICAL_REACTIVATION_VACANCY_ID } = require('./hh-vacancy-registry')

const SCOPES = Object.freeze([
  { vacancyId: HISTORICAL_REACTIVATION_VACANCY_ID, bucket: 'CHELYABINSK_PROVEN' },
  { vacancyId: '136455388', bucket: 'OTHER' },
])

function opaque(key, purpose, value) {
  return createHmac('sha256', key).update(`hh-chat-link-v1:${purpose}:`).update(String(value)).digest('hex')
}

function ownerAlias(key, chatId) {
  return `HC-${opaque(key, 'chat', chatId).slice(0, 24)}`
}

function viewedMarkers(key, participants) {
  return participants.map(participant => ({
    role: ['APPLICANT', 'EMPLOYER'].includes(participant.role) ? participant.role : 'OTHER',
    participant_alias: opaque(key, 'participant', participant.participantId).slice(0, 24),
    viewed_marker: participant.lastViewedMessageId
      ? opaque(key, 'viewed', participant.lastViewedMessageId).slice(0, 24) : null,
  })).sort((a, b) => a.participant_alias.localeCompare(b.participant_alias))
}

function aggregate(rows) {
  const count = predicate => rows.filter(predicate).length
  return {
    total_chats: rows.length,
    chelyabinsk_chats: count(row => row.vacancyBucket === 'CHELYABINSK_PROVEN'),
    other_chats: count(row => row.vacancyBucket === 'OTHER'),
    unknown_bucket_chats: count(row => row.vacancyBucket === 'UNKNOWN'),
    provider_linked: count(row => row.linkStatus === 'PROVIDER_LINKED'),
    identity_linked: count(row => row.identityLinked),
    hh_state_known: count(row => row.hhStateKnown),
    participants_scanned: count(row => row.participantsScanned),
    participants_not_scanned: count(row => !row.participantsScanned),
    unknown_identity: count(row => !row.identityLinked),
    chelyabinsk_candidates: null,
    status_known: null,
    eligible_for_review: null,
    excluded: null,
    messages_read: 0,
    sends: 0,
  }
}

async function buildChatLinkRun({ api, token, store, key, maxChats = 800,
  maxParticipantReads = 100, maxParticipantMs = 10 * 60 * 1000,
  observedAt = null, makeRunId = randomUUID }) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('HH_CHAT_LINK_KEY_INVALID')
  const byId = new Map()
  let pagesRead = 0
  for (const scope of SCOPES) {
    const inventory = await inventoryChats({ api, token, vacancyIds: [scope.vacancyId] })
    pagesRead += inventory.pagesRead
    for (const chat of inventory.chats) {
      const existing = byId.get(chat.chatId)
      if (existing && (existing.chat.unreadCount !== chat.unreadCount ||
          existing.chat.lastMessageId !== chat.lastMessageId)) throw new Error('HH_CHAT_LINK_SNAPSHOT_CHANGED')
      if (existing) existing.scopes.add(scope.vacancyId)
      else byId.set(chat.chatId, { chat, scopes: new Set([scope.vacancyId]) })
      if (byId.size > maxChats) throw new Error('HH_CHAT_LINK_BOUND_EXCEEDED')
    }
  }

  const rows = []
  const deadline = Date.now() + maxParticipantMs
  let participantReads = 0
  const prioritized = [...byId.entries()].sort(([a, left], [b, right]) =>
    Number(right.chat.unreadCount > 0) - Number(left.chat.unreadCount > 0) || a.localeCompare(b))
  for (const [chatId, entry] of prioritized) {
    const scope = entry.scopes.size === 1 ? SCOPES.find(item => entry.scopes.has(item.vacancyId)) : null
    const participantsScanned = participantReads < maxParticipantReads && Date.now() < deadline
    let participants = []
    if (participantsScanned) {
      participantReads++
      try {
        participants = projectParticipants(await api.get(`/common/chats/${chatId}/participants?host=hh.ru`,
          token, `/common/chats/${chatId}/participants`))
      } catch (error) {
        if (error?.status !== 404) throw error
      }
    }
    const applicants = participants.filter(item => item.role === 'APPLICANT' && item.resumeId)
    const resumeId = applicants.length === 1 ? applicants[0].resumeId : null
    let linkStatus = !scope ? 'AMBIGUOUS_VACANCY' : !participantsScanned
      ? 'PARTICIPANTS_NOT_SCANNED' : applicants.length !== 1
        ? 'APPLICANT_RESUME_UNPROVEN' : 'NEGOTIATION_UNPROVEN'
    let negotiationId = null
    let identityLinked = false
    let hhStateKnown = false
    if (scope && resumeId) {
      const matches = await store.findNegotiationsByResume(scope.vacancyId, resumeId)
      if (!Array.isArray(matches) || matches.length > 2) throw new Error('HH_CHAT_LINK_LOOKUP_INVALID')
      if (matches.length > 1) linkStatus = 'AMBIGUOUS_NEGOTIATION'
      if (matches.length === 1) {
        const match = matches[0]
        negotiationId = String(match.negotiation_id)
        linkStatus = 'PROVIDER_LINKED'
        identityLinked = Boolean(match.person_id && match.identity_status === 'proved_link')
        hhStateKnown = Boolean(match.applicant_state || match.employer_state)
      }
    }
    rows.push({
      chatAlias: ownerAlias(key, chatId), chatIdBox: seal(chatId, key),
      vacancyId: scope?.vacancyId || null, vacancyBucket: scope?.bucket || 'UNKNOWN',
      resumeKey: resumeId ? opaque(key, 'resume', resumeId) : null,
      negotiationId, linkStatus, identityLinked, hhStateKnown, participantsScanned,
      unreadCount: entry.chat.unreadCount,
      lastMessageMarker: entry.chat.lastMessageId
        ? opaque(key, 'message', entry.chat.lastMessageId).slice(0, 24) : null,
      participantViewedMarkers: viewedMarkers(key, participants),
    })
  }
  const counts = aggregate(rows)
  const observed = new Date(observedAt || Date.now())
  if (!Number.isFinite(observed.getTime())) throw new Error('HH_CHAT_LINK_TIME_INVALID')
  const runId = makeRunId()
  if (!/^[0-9a-fA-F-]{36}$/.test(runId)) throw new Error('HH_CHAT_LINK_RUN_ID_INVALID')
  const hashInput = rows.sort((a, b) => a.chatAlias.localeCompare(b.chatAlias)).map(row =>
    [row.chatAlias, row.vacancyBucket, row.resumeKey,
    row.negotiationId, row.linkStatus, row.unreadCount, row.lastMessageMarker,
    row.participantViewedMarkers])
  const snapshotHash = opaque(key, 'snapshot', JSON.stringify(hashInput))
  return { runId, snapshotHash, observedAt: observed.toISOString(), counts, rows, pagesRead }
}

function operatorProjection(row) {
  return { owner_alias: row.chat_alias, vacancy_bucket: row.vacancy_bucket,
    unread_count: Number(row.unread_count), last_message_marker: row.last_message_marker,
    participant_viewed_markers: row.participant_viewed_markers,
    link_status: row.link_status, identity_linked: row.identity_linked }
}

module.exports = { SCOPES, ownerAlias, aggregate, buildChatLinkRun, operatorProjection }
