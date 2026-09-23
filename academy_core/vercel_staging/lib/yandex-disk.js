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

async function listFolder(path, oauthToken, fetchImpl = fetch) {
  const query = new URLSearchParams({ path, limit: '1000', fields: 'name,path,type,resource_id,public_url,_embedded.items.name,_embedded.items.path,_embedded.items.type,_embedded.items.size,_embedded.items.mime_type,_embedded.total' })
  const response = await fetchImpl(`${API_ROOT}/resources?${query}`, { headers: headers(oauthToken) })
  const body = await responseBody(response)
  if (response.status !== 200) {
    const error = new Error(`yandex_disk_list_failed_${response.status}`)
    error.code = body?.error || `http_${response.status}`
    throw error
  }
  return body
}

async function uploadFile(path, content, oauthToken, fetchImpl = fetch, contentLength = null) {
  const query = new URLSearchParams({ path, overwrite: 'false', fields: 'href,method,templated' })
  const linkResponse = await fetchImpl(`${API_ROOT}/resources/upload?${query}`, { headers: headers(oauthToken) })
  const linkBody = await responseBody(linkResponse)
  if (![200, 409].includes(linkResponse.status)) {
    const error = new Error(`yandex_disk_upload_link_failed_${linkResponse.status}`)
    error.code = linkBody?.error || `http_${linkResponse.status}`
    throw error
  }
  if (linkResponse.status === 409) return { created: false, existed: true }
  const uploadOptions = { method: 'PUT', body: content }
  if (content && typeof content.getReader === 'function') {
    uploadOptions.duplex = 'half'
    if (Number.isSafeInteger(contentLength) && contentLength >= 0) uploadOptions.headers = { 'content-length': String(contentLength) }
  }
  const uploadResponse = await fetchImpl(linkBody.href, uploadOptions)
  if (![201, 202].includes(uploadResponse.status)) throw new Error(`yandex_disk_upload_failed_${uploadResponse.status}`)
  return { created: true, existed: false }
}

async function publishResource(path, oauthToken, fetchImpl = fetch) {
  const query = new URLSearchParams({ path })
  const response = await fetchImpl(`${API_ROOT}/resources/publish?${query}`, { method: 'PUT', headers: headers(oauthToken) })
  const body = await responseBody(response)
  if (![200, 201, 202].includes(response.status)) {
    const error = new Error(`yandex_disk_publish_failed_${response.status}`)
    error.code = body?.error || `http_${response.status}`
    throw error
  }
  const resourceResponse = await fetchImpl(resourceUrl(path, 'name,path,type,resource_id,public_url,public_key'), { headers: headers(oauthToken) })
  const resource = await responseBody(resourceResponse)
  if (resourceResponse.status !== 200 || !resource?.public_url) throw new Error('yandex_disk_publish_readback_failed')
  return resource
}

module.exports = { API_ROOT, createFolder, readFolder, ensurePrivateFolder, listFolder, uploadFile, publishResource }
