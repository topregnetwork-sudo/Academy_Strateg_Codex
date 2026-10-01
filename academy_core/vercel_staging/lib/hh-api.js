const { HH_API_ORIGIN, HH_REDIRECT_URI, safeApiUrl } = require('./hh-security')

function hhApi(env, fetchImpl = fetch) {
  const agent = String(env.HH_API_USER_AGENT || '')
  if (!/^.{3,100}\([^()\s]+@[^()\s]+\)$/.test(agent)) throw new Error('HH_USER_AGENT_REQUIRED')
  const clientId = String(env.HH_CLIENT_ID || '')
  const clientSecret = String(env.HH_CLIENT_SECRET || '')
  if (!clientId || !clientSecret) throw new Error('HH_CREDENTIALS_REQUIRED')

  async function request(url, { token, method = 'GET', body, expectedPath = '/' } = {}) {
    const target = safeApiUrl(url, expectedPath)
    if (!['GET', 'POST'].includes(method)) throw new Error('HH_METHOD_REJECTED')
    if (method === 'POST' && target.pathname !== '/token') throw new Error('HH_METHOD_REJECTED')
    const headers = { 'HH-User-Agent': agent, 'User-Agent': agent, Accept: 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    if (body) headers['Content-Type'] = 'application/x-www-form-urlencoded'
    const response = await fetchImpl(target, { method, headers, body, signal: AbortSignal.timeout(15000), redirect: 'error' })
    if (!response.ok) {
      const error = new Error(`HH_HTTP_${response.status}`)
      error.status = response.status
      throw error
    }
    if (response.status === 204) return null
    const data = await response.json()
    if (!data || typeof data !== 'object') throw new Error('HH_RESPONSE_INVALID')
    return data
  }

  function authorizeUrl({ state, challenge }) {
    const url = new URL('https://hh.ru/oauth/authorize')
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('redirect_uri', HH_REDIRECT_URI)
    url.searchParams.set('state', state)
    url.searchParams.set('code_challenge', challenge)
    url.searchParams.set('code_challenge_method', 'S256')
    return url.toString()
  }

  async function exchangeCode(code, verifier) {
    const body = new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId,
      client_secret: clientSecret, code, redirect_uri: HH_REDIRECT_URI, code_verifier: verifier })
    return request(`${HH_API_ORIGIN}/token`, { method: 'POST', body, expectedPath: '/token' })
  }

  async function refreshToken(refresh) {
    const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh,
      client_id: clientId, client_secret: clientSecret })
    return request(`${HH_API_ORIGIN}/token`, { method: 'POST', body, expectedPath: '/token' })
  }

  async function get(pathOrUrl, token, expectedPath = '/') {
    return request(pathOrUrl, { token, expectedPath })
  }

  async function subscribe({ token, receiverUrl, vacanciesOnlyMine = false }) {
    const target = safeApiUrl(`${HH_API_ORIGIN}/webhook/subscriptions`, '/webhook/subscriptions')
    const response = await fetchImpl(target, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { 'HH-User-Agent': agent, 'User-Agent': agent, Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ url: receiverUrl, actions: [{ type: 'NEW_NEGOTIATION_VACANCY',
        settings: { vacancies_only_mine: vacanciesOnlyMine } }] }),
    })
    if (!response.ok) {
      const error = new Error(`HH_SUBSCRIPTION_HTTP_${response.status}`)
      error.status = response.status
      throw error
    }
    return response.json()
  }

  return { authorizeUrl, exchangeCode, refreshToken, get, subscribe }
}

module.exports = { hhApi }
