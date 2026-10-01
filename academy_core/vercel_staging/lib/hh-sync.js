const { sha256, safeApiUrl } = require('./hh-security')
const { HISTORICAL_REACTIVATION_VACANCY_ID, vacancyLifecycleFields } = require('./hh-vacancy-registry')

const VACANCY_ID = '136455388'
const CHELYABINSK_ANCHOR_ID = HISTORICAL_REACTIVATION_VACANCY_ID
const EXPECTED_MANAGER_NAME = 'Шипунов Максим Александрович'
const EXPECTED_EMPLOYER_UI_ID = '1702778'

function managerContext(me) {
  const managerName = [me.last_name, me.first_name, me.middle_name].filter(Boolean).join(' ').trim()
  const employer = me.employer || (Array.isArray(me.employers) ? me.employers.find(x => String(x.id) === EXPECTED_EMPLOYER_UI_ID) : null)
  return {
    managerId: String(me.id || me.manager_id || ''), managerName,
    employerId: String(employer?.id || me.employer_id || ''), employerName: String(employer?.name || ''),
  }
}

function verifyContext(context) {
  return context.managerId.length > 0 && context.managerName === EXPECTED_MANAGER_NAME &&
    context.employerId === EXPECTED_EMPLOYER_UI_ID && context.employerName.length > 0
}

function metadataOnly(item) {
  return {
    id: String(item.id || ''),
    resume: item.resume?.id ? { id: String(item.resume.id) } : null,
    state: item.state?.id ? { id: String(item.state.id) } : null,
    employer_state: item.employer_state?.id ? { id: String(item.employer_state.id) } : null,
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
    __detail_status: item.__detail_status || 'not_read',
  }
}

function vacancyCity(vacancy) {
  const names = [vacancy.area?.name, ...(Array.isArray(vacancy.areas) ? vacancy.areas.map(x => x?.name) : [])]
  if (names.includes('Челябинск')) return 'CHELYABINSK_PROVEN'
  if (names.some(Boolean)) return 'OTHER'
  return 'UNKNOWN'
}

async function discoverVacancies({ api, token, store, maxPages = 100, maxVacancies = 500 }) {
  const ids = new Set([VACANCY_ID, CHELYABINSK_ANCHOR_ID])
  for (const status of ['active', 'archived', 'hidden']) {
    const prefix = `/employers/${EXPECTED_EMPLOYER_UI_ID}/vacancies/${status}`
    let pages = 1
    for (let page = 0; page < pages; page++) {
      if (page >= maxPages) throw new Error('HH_VACANCY_PAGE_BOUND_EXCEEDED')
      let result
      try { result = await api.get(`${prefix}?page=${page}&per_page=50&host=hh.ru`, token, prefix) }
      catch (error) {
        if (status === 'hidden' && page === 0 && [403, 404].includes(error.status)) break
        throw error
      }
      if (!Array.isArray(result.items) || result.page !== page || !Number.isInteger(result.pages) ||
          result.pages < 1 || result.pages > maxPages) throw new Error('HH_VACANCY_PAGE_INVALID')
      pages = result.pages
      for (const item of result.items) {
        const id = String(item.id || '')
        if (!/^\d+$/.test(id)) throw new Error('HH_VACANCY_ID_INVALID')
        ids.add(id)
        if (ids.size > maxVacancies) throw new Error('HH_VACANCY_BOUND_EXCEEDED')
      }
    }
  }
  const included = []
  const classes = { CHELYABINSK_PROVEN: 0, OTHER: 0, UNKNOWN: 0 }
  let minskBaselineProven = false
  for (const vacancyId of ids) {
    const vacancy = await api.get(`/vacancies/${vacancyId}?host=hh.ru`, token, `/vacancies/${vacancyId}`)
    if (String(vacancy.id) !== vacancyId || String(vacancy.employer?.id || '') !== EXPECTED_EMPLOYER_UI_ID) {
      throw new Error('HH_VACANCY_EMPLOYER_MISMATCH')
    }
    const classification = vacancyCity(vacancy)
    if (vacancyId === VACANCY_ID) {
      minskBaselineProven = [vacancy.area?.name, ...(Array.isArray(vacancy.areas)
        ? vacancy.areas.map(area => area?.name) : [])].includes('Минск')
    }
    classes[classification]++
    await store.saveVacancy({ employerId: EXPECTED_EMPLOYER_UI_ID, vacancyId,
      name: String(vacancy.name || '').slice(0, 500), archived: Boolean(vacancy.archived),
      publishedAt: vacancy.published_at || null, classification,
      areaId: vacancy.area?.id ? String(vacancy.area.id) : null,
      areaName: vacancy.area?.name ? String(vacancy.area.name).slice(0, 200) : null,
      ...vacancyLifecycleFields(vacancyId),
      snapshotHash: sha256(JSON.stringify({ id: vacancy.id, employer: vacancy.employer?.id,
        area: vacancy.area?.id, areas: vacancy.areas?.map(x => x?.id),
        archived: vacancy.archived, published_at: vacancy.published_at })) })
    if (vacancyId === VACANCY_ID || classification === 'CHELYABINSK_PROVEN') included.push(vacancyId)
  }
  if (!ids.has(CHELYABINSK_ANCHOR_ID) || !included.includes(CHELYABINSK_ANCHOR_ID)) {
    throw new Error('HH_CHELYABINSK_ANCHOR_UNPROVEN')
  }
  return { included, classified: ids.size, classes, minskBaselineProven }
}

async function syncVacancy({ api, token, store, vacancyId = VACANCY_ID, maxPages = 1000 }) {
  if (!/^\d+$/.test(vacancyId)) throw new Error('HH_VACANCY_ID_INVALID')
  const vacancy = await api.get(`/vacancies/${vacancyId}?host=hh.ru`, token, `/vacancies/${vacancyId}`)
  if (String(vacancy.id) !== vacancyId || String(vacancy.employer?.id || '') !== EXPECTED_EMPLOYER_UI_ID) {
    throw new Error('HH_VACANCY_EMPLOYER_MISMATCH')
  }
  await store.saveVacancy({ employerId: EXPECTED_EMPLOYER_UI_ID, vacancyId,
    name: String(vacancy.name || '').slice(0, 500), archived: Boolean(vacancy.archived),
    publishedAt: vacancy.published_at || null, classification: vacancyCity(vacancy),
    areaId: vacancy.area?.id ? String(vacancy.area.id) : null,
    areaName: vacancy.area?.name ? String(vacancy.area.name).slice(0, 200) : null,
    ...vacancyLifecycleFields(vacancyId),
    snapshotHash: sha256(JSON.stringify({ id: vacancy.id, employer: vacancy.employer?.id,
      archived: vacancy.archived, published_at: vacancy.published_at })) })

  const discoveryUrl = `/negotiations?vacancy_id=${vacancyId}&host=hh.ru`
  const discovery = await api.get(discoveryUrl, token, '/negotiations')
  if (!Array.isArray(discovery.collections)) throw new Error('HH_COLLECTIONS_INVALID')
  const collectionHash = sha256(JSON.stringify(discovery.collections.map(x => [x.id, x.url, x.counters?.total])))
  let pagesRead = 0
  let rawRows = 0
  let inserted = 0
  for (const collection of discovery.collections) {
    const collectionId = String(collection.id || '')
    if (!collectionId || !collection.url) throw new Error('HH_COLLECTION_INVALID')
    const base = safeApiUrl(collection.url, '/negotiations/')
    if (base.searchParams.get('vacancy_id') !== vacancyId) throw new Error('HH_COLLECTION_VACANCY_MISMATCH')
    let pages = 1
    for (let page = 0; page < pages; page++) {
      if (pagesRead >= maxPages) throw new Error('HH_PAGE_BOUND_EXCEEDED')
      const url = new URL(base)
      url.searchParams.set('page', String(page))
      url.searchParams.set('per_page', '50')
      url.searchParams.set('host', 'hh.ru')
      const result = await api.get(url.toString(), token, '/negotiations/')
      if (!Array.isArray(result.items) || result.page !== page || !Number.isInteger(result.pages) || result.pages < 1 || result.pages > maxPages) {
        throw new Error('HH_PAGE_INVALID')
      }
      pages = result.pages
      const items = []
      for (const raw of result.items) {
        const item = metadataOnly(raw)
        if (!item.id) throw new Error('HH_NEGOTIATION_ID_MISSING')
        const detailUrl = raw.url ? safeApiUrl(raw.url, '/negotiations/') : safeApiUrl(`/negotiations/${encodeURIComponent(item.id)}`, '/negotiations/')
        try {
          const detail = await api.get(detailUrl.toString(), token, '/negotiations/')
          if (String(detail.id || '') !== item.id) throw new Error('HH_DETAIL_ID_MISMATCH')
          item.__detail_status = '200'
          if (detail.state?.id) item.state = { id: String(detail.state.id) }
          if (detail.employer_state?.id) item.employer_state = { id: String(detail.employer_state.id) }
          if (detail.updated_at) item.updated_at = detail.updated_at
        } catch (error) {
          if (error.status === 403 || error.status === 404) item.__detail_status = String(error.status)
          else throw error
        }
        items.push(item)
      }
      const saved = await store.savePage({ employerId: EXPECTED_EMPLOYER_UI_ID, vacancyId,
        collectionId, page, collectionHash,
        pageHash: sha256(JSON.stringify(items)), found: result.found, pages: result.pages, items })
      pagesRead++
      rawRows += items.length
      inserted += saved.inserted
    }
  }
  const after = await api.get(discoveryUrl, token, '/negotiations')
  const afterHash = sha256(JSON.stringify(after.collections?.map(x => [x.id, x.url, x.counters?.total])))
  if (afterHash !== collectionHash) throw new Error('HH_COLLECTION_SNAPSHOT_CHANGED')
  await store.markSync()
  return { vacancyId, collections: discovery.collections.length, pagesRead, rawRows, inserted,
    snapshotStable: true, messagesRead: 0, writes: 0 }
}

module.exports = { VACANCY_ID, CHELYABINSK_ANCHOR_ID, EXPECTED_MANAGER_NAME, EXPECTED_EMPLOYER_UI_ID,
  managerContext, verifyContext, metadataOnly, vacancyCity, discoverVacancies, syncVacancy }
