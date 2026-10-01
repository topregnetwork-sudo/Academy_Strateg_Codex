const DAY_MS = 24 * 60 * 60 * 1000

const ERASURE_TARGETS = Object.freeze([
  'postgres_candidate_pii',
  'yandex_candidate_folder',
  'telegram_contact',
  'email_message',
  'application_logs',
  'backups',
])

function addDays(value, days) {
  return new Date(new Date(value).getTime() + days * DAY_MS).toISOString()
}

function addMonths(value, months) {
  const result = new Date(value)
  result.setUTCMonth(result.getUTCMonth() + months)
  return result.toISOString()
}

function requestDeadlines(receivedAt) {
  const received = new Date(receivedAt)
  if (Number.isNaN(received.getTime())) throw new Error('invalid_received_at')
  return {
    responseDueAt: addDays(received, 7),
    erasureDueAt: addDays(received, 30),
    fallbackDestroyDueAt: addMonths(received, 6),
  }
}

function activeHolds(holds = [], now = new Date()) {
  const at = new Date(now).getTime()
  return holds.filter((hold) => hold?.state === 'active' && (!hold.retain_until || new Date(hold.retain_until).getTime() > at))
}

function buildErasurePlan({ requestId, profileId, receivedAt, identityVerified, holds = [] }) {
  if (!requestId || !profileId) throw new Error('request_and_profile_required')
  const deadlines = requestDeadlines(receivedAt)
  if (!identityVerified) {
    return { state: 'identity_check', processingRestricted: true, deadlines, jobs: [] }
  }

  const retained = activeHolds(holds)
  const heldScopes = new Set(retained.map((hold) => hold.scope))
  const financialHold = ['contract','accounting','tax','payout','dispute'].some((scope) => heldScopes.has(scope))
  const jobs = ERASURE_TARGETS.map((target) => {
    const isFinanciallyHeld = financialHold && target === 'postgres_candidate_pii'
    return {
      requestId,
      profileId,
      target,
      action: target === 'backups' ? 'expire' : target === 'application_logs' ? 'anonymize' : 'erase',
      dueAt: deadlines.erasureDueAt,
      state: isFinanciallyHeld ? 'held' : 'queued',
      holdReason: isFinanciallyHeld ? 'minimal_legal_ledger_only' : null,
    }
  })
  return { state: 'approved', processingRestricted: true, deadlines, activeHolds: retained, jobs }
}

module.exports = { DAY_MS, ERASURE_TARGETS, requestDeadlines, activeHolds, buildErasurePlan }
