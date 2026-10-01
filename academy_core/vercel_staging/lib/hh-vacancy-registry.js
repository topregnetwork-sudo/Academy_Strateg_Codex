const REGISTRY_VERSION = 'hh-vacancy-lifecycle.v11'
const HISTORICAL_REACTIVATION_VACANCY_ID = '136453079'

const HH_VACANCY_LIFECYCLE_REGISTRY_V11 = Object.freeze({
  [HISTORICAL_REACTIVATION_VACANCY_ID]: Object.freeze({
    source_mode: 'HISTORICAL_REACTIVATION',
    vacancy_lifecycle: 'ARCHIVED',
    archived_since: '2026-09-19',
    active_acquisition_entry: false,
    active_for_live: false,
  }),
})

function vacancyLifecycle(vacancyId) {
  return HH_VACANCY_LIFECYCLE_REGISTRY_V11[String(vacancyId)] || null
}

function vacancyLifecycleFields(vacancyId) {
  const lifecycle = vacancyLifecycle(vacancyId)
  return lifecycle ? { ...lifecycle } : {}
}

function activeAcquisitionAllowed(vacancyId) {
  const lifecycle = vacancyLifecycle(vacancyId)
  return lifecycle === null ||
    (lifecycle.active_acquisition_entry === true && lifecycle.active_for_live === true)
}

module.exports = { REGISTRY_VERSION, HISTORICAL_REACTIVATION_VACANCY_ID,
  HH_VACANCY_LIFECYCLE_REGISTRY_V11, vacancyLifecycle, vacancyLifecycleFields,
  activeAcquisitionAllowed }
