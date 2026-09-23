const API_ROOT = 'https://cloud-api.yandex.net/v1/disk'

function headers(oauthToken) {
  if (!oauthToken) throw new Error('yandex_disk_oauth_not_configured')
  return { Authorization: `OAuth ${oauthToken}`, Accept: 'application/json' }
}

function resourceUrl(path, fields) {
  const query = new URLSearchParams({ path })
  if (fields) query.set('fields', fields)
  return `${API_ROOT}/resources?${query}`
}

async function responseBody(response) {
  const text = await response.text()
  if (!text) return null
  try { return JSON.parse(text) } catch { return { message: text.slice(0, 200) } }
}

async function createFolder(path, oauthToken, fetchImpl = fetch) {
  const response = await fetchImpl(resourceUrl(path), {
    method: 'PUT',
    headers: headers(oauthToken),
  })
  if (![201, 409].includes(response.status)) {
    const body = await responseBody(response)
    const error = new Error(`yandex_disk_create_failed_${response.status}`)
    error.code = body?.error || `http_${response.status}`
    throw error
  }
  return { created: response.status === 201, existed: response.status === 409 }
}

async function readFolder(path, oauthToken, fetchImpl = fetch) {
  const response = await fetchImpl(resourceUrl(path, 'name,path,type,resource_id,created,modified'), {
    method: 'GET',
    headers: headers(oauthToken),
  })
  const body = await responseBody(response)
  if (response.status !== 200) {
    const error = new Error(`yandex_disk_readback_failed_${response.status}`)
    error.code = body?.error || `http_${response.status}`
    throw error
  }
  if (body?.type !== 'dir') throw new Error('yandex_disk_readback_not_directory')
  return body
}

async function ensurePrivateFolder(path, oauthToken, fetchImpl = fetch) {
  const provision = await createFolder(path, oauthToken, fetchImpl)
  const resource = await readFolder(path, oauthToken, fetchImpl)
  const expected = `disk:/${String(path).replace(/^\/+/, '')}`
  if (resource.path !== expected) throw new Error('yandex_disk_readback_path_mismatch')
  return {
    ...provision,
    name: resource.name,
    path: resource.path,
    resourceId: resource.resource_id || null,
    createdAt: resource.created || null,
    modifiedAt: resource.modified || null,
  }
}

module.exports = { API_ROOT, createFolder, readFolder, ensurePrivateFolder }
