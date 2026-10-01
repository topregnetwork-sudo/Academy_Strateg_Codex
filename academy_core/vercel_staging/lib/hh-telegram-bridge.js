const { sha256 } = require('./hh-security')
const { activeAcquisitionAllowed } = require('./hh-vacancy-registry')

const EVENT_KIND = 'hh_negotiation_observed'

function bridgeJob({ employerId, vacancyId, negotiationId, personId = null, journeyId = null,
  templateRef = null }) {
  if (!/^\d+$/.test(String(employerId)) || !/^\d+$/.test(String(vacancyId)) ||
      !/^[A-Za-z0-9_-]+$/.test(String(negotiationId))) throw new Error('HH_BRIDGE_ID_INVALID')
  if (!activeAcquisitionAllowed(vacancyId)) throw new Error('HH_ACTIVE_ACQUISITION_SOURCE_BLOCKED')
  const idempotencyKey = sha256(`hh.ru:${employerId}:${vacancyId}:${negotiationId}:observed`)
  const linked = Boolean(personId && journeyId && templateRef)
  return Object.freeze({ eventKind: EVENT_KIND, correlationId: idempotencyKey,
    idempotencyKey, personId: linked ? personId : null, journeyId: linked ? journeyId : null,
    templateRef: linked ? templateRef : null,
    deliveryState: linked ? 'queued' : 'awaiting_identity' })
}

module.exports = { EVENT_KIND, bridgeJob }
