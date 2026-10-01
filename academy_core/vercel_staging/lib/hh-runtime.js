const fs = require('node:fs')
const path = require('node:path')
const { Pool } = require('pg')
const { databaseConfig } = require('./batman-runtime-config')
const { hhStore } = require('./hh-store')
const { hhApi } = require('./hh-api')
const { syncVacancy, managerContext, verifyContext } = require('./hh-sync')
const { HH_REDIRECT_URI, HH_SESSION_TTL_MS, sha256, encryptionKey, seal, open,
  randomOpaque, challenge, signReceiver, fixedEqual } = require('./hh-security')

const POLL_MS = 15 * 60 * 1000
const LOCK_ID = 73451001
const APPLICATION_ID = '29768'

function json(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff' })
  response.end(JSON.stringify(body))
}

function cookieValue(request, name) {
  const pair = String(request.headers.cookie || '').split(';').map(x => x.trim())
    .find(x => x.startsWith(`${name}=`))
  return pair ? pair.slice(name.length + 1) : ''
}

function tokenExpiry(tokens) {
  const seconds = Number(tokens.expires_in)
  if (!Number.isFinite(seconds) || seconds < 60 || seconds > 86400 * 365) throw new Error('HH_TOKEN_EXPIRY_INVALID')
  return new Date(Date.now() + seconds * 1000)
}

function validTokenResponse(tokens) {
  return tokens && typeof tokens.access_token === 'string' && tokens.access_token.length >= 20 &&
    typeof tokens.refresh_token === 'string' && tokens.refresh_token.length >= 20
}

function createHHRuntime(env = process.env, deps = {}) {
  const pool = deps.pool || new Pool(databaseConfig(env))
  const store = deps.store || hhStore(pool)
  const fetchImpl = deps.fetch || fetch
  const state = { schema: 'pending', connection: 'unknown', sync: 'never', lastError: null,
    lastSync: null, subscriptions: 'disabled' }
  let timer = null
  let running = false

  function enabled() { return env.HH_OAUTH_ENABLED === 'true' }
  function webhookEnabled() { return enabled() && env.HH_WEBHOOK_ENABLED === 'true' }

  async function migrate() {
    if (env.HH_SCHEMA_MIGRATE_ON_START !== 'true') { state.schema = 'not_requested'; return }
    const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', '0011_hh_employer_inbound.sql'), 'utf8')
    await pool.query(sql)
    state.schema = 'ready'
  }

  async function tokenForCycle(api, key) {
    let connection = await store.connection()
    if (!connection || connection.status !== 'active') throw new Error('HH_CONNECTION_NOT_ACTIVE')
    if (!connection.access_box || !connection.refresh_box) throw new Error('HH_TOKEN_MISSING')
    if (new Date(connection.expires_at).getTime() > Date.now() + 5 * 60 * 1000) {
      return open(connection.access_box, key)
    }
    const refresh = open(connection.refresh_box, key)
    let tokens
    try { tokens = await api.refreshToken(refresh) }
    catch (_) {
      await store.recoveryRequired('HH_REFRESH_FAILED')
      throw new Error('HH_REFRESH_FAILED')
    }
    if (!validTokenResponse(tokens)) throw new Error('HH_REFRESH_RESPONSE_INVALID')
    const saved = await store.updateTokens({ accessBox: seal(tokens.access_token, key),
      refreshBox: seal(tokens.refresh_token, key), expiresAt: tokenExpiry(tokens),
      expectedVersion: connection.token_version })
    if (!saved) throw new Error('HH_REFRESH_RACE')
    return tokens.access_token
  }

  async function ensureSubscription(api, token, key) {
    if (!webhookEnabled()) return
    const receiver = signReceiver('hh-ru-employer', key)
    const receiverUrl = new URL(HH_REDIRECT_URI)
    receiverUrl.pathname = `/integrations/hh/webhook/${receiver}`
    const existing = await api.get('/webhook/subscriptions?host=hh.ru', token, '/webhook/subscriptions')
    const match = Array.isArray(existing.items) ? existing.items.find(item => item.url === receiverUrl.toString() &&
      item.actions?.some(action => action.type === 'NEW_NEGOTIATION_VACANCY')) : null
    const subscription = match || await api.subscribe({ token, receiverUrl: receiverUrl.toString(), vacanciesOnlyMine: false })
    if (!subscription?.id) throw new Error('HH_SUBSCRIPTION_READBACK_MISSING')
    await store.saveSubscription({ subscriptionId: String(subscription.id), receiverHash: sha256(receiver) })
    state.subscriptions = 'active'
  }

  async function runCycle() {
    if (!enabled() || running || state.schema !== 'ready') return
    running = true
    let lock
    let acquired = false
    try {
      lock = await pool.connect()
      const result = await lock.query('select pg_try_advisory_lock($1) as acquired', [LOCK_ID])
      acquired = result.rows[0]?.acquired === true
      if (!acquired) return
      const current = await store.connection()
      if (!current || current.status === 'pending_review') {
        state.connection = 'awaiting_oauth'
        return
      }
      state.connection = current.status
      if (current.status !== 'active') return
      const key = encryptionKey(env)
      const api = hhApi(env, fetchImpl)
      const token = await tokenForCycle(api, key)
      const readback = await syncVacancy({ api, token, store })
      state.sync = 'ready'
      state.lastSync = new Date().toISOString()
      state.lastError = null
      state.lastCounts = { collections: readback.collections, pages: readback.pagesRead,
        rawRows: readback.rawRows, inserted: readback.inserted }
      await ensureSubscription(api, token, key)
    } catch (error) {
      const code = /^HH_[A-Z0-9_]+$/.test(error?.message || '') ? error.message : 'HH_CYCLE_FAILED'
      state.sync = 'failed'
      state.lastError = code
      try { await store.markError(code) } catch (_) { /* no secret logging */ }
    } finally {
      if (acquired) try { await lock.query('select pg_advisory_unlock($1)', [LOCK_ID]) } catch (_) { /* connection closes */ }
      lock?.release()
      running = false
    }
  }

  async function start() {
    try { await migrate() }
    catch (_) { state.schema = 'failed'; state.lastError = 'HH_SCHEMA_FAILED'; return }
    if (!enabled()) return
    timer = setInterval(() => { void runCycle() }, POLL_MS)
    timer.unref?.()
    void runCycle()
  }

  async function oauthStart(request, response) {
    if (!enabled() || state.schema !== 'ready') return json(response, 503, { ok: false, code: 'HH_DISABLED' })
    try {
      const key = encryptionKey(env)
      const api = hhApi(env, fetchImpl)
      const browser = randomOpaque()
      const stateValue = randomOpaque()
      const verifier = randomOpaque()
      const issued = new Date()
      await pool.query(`insert into hh_oauth_sessions
        (state_hash,browser_hash,verifier_box,issued_at,expires_at)
        values($1,$2,$3,$4,$5)`, [sha256(stateValue), sha256(browser), seal(verifier, key),
        issued, new Date(issued.getTime() + HH_SESSION_TTL_MS)])
      response.writeHead(302, { location: api.authorizeUrl({ state: stateValue, challenge: challenge(verifier) }),
        'set-cookie': `hh_oauth_session=${browser}; Path=/integrations/hh/oauth; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
        'cache-control': 'no-store', 'referrer-policy': 'no-referrer' })
      response.end()
    } catch (_) { json(response, 503, { ok: false, code: 'HH_START_UNAVAILABLE' }) }
  }

  async function oauthCallback(request, response, url) {
    if (!enabled() || state.schema !== 'ready') return json(response, 503, { ok: false, code: 'HH_DISABLED' })
    const stateValue = url.searchParams.get('state') || ''
    const code = url.searchParams.get('code') || ''
    const browser = cookieValue(request, 'hh_oauth_session')
    if (!/^[A-Za-z0-9_-]{43}$/.test(stateValue) || !/^[A-Za-z0-9_-]{43}$/.test(browser) || code.length < 8 || code.length > 2048) {
      return json(response, 400, { ok: false, code: 'HH_CALLBACK_REJECTED' })
    }
    try {
      const consumed = await store.consumeSession(sha256(stateValue), sha256(browser))
      if (!consumed) return json(response, 400, { ok: false, code: 'HH_CALLBACK_REJECTED' })
      const key = encryptionKey(env)
      const verifier = open(consumed.verifier_box, key)
      const api = hhApi(env, fetchImpl)
      const tokens = await api.exchangeCode(code, verifier)
      if (!validTokenResponse(tokens)) throw new Error('HH_TOKEN_RESPONSE_INVALID')
      const me = await api.get('/me?host=hh.ru', tokens.access_token, '/me')
      const context = managerContext(me)
      if (!verifyContext(context)) {
        return json(response, 409, { ok: false, code: 'HH_IDENTITY_CONFLICT' })
      }
      await store.saveToken({ applicationId: APPLICATION_ID, accessBox: seal(tokens.access_token, key),
        refreshBox: seal(tokens.refresh_token, key), expiresAt: tokenExpiry(tokens) })
      await store.verifyManager({ ...context, expectedEmployerId: context.employerId })
      state.connection = 'active'
      response.setHeader('set-cookie', 'hh_oauth_session=; Path=/integrations/hh/oauth; Max-Age=0; HttpOnly; Secure; SameSite=Lax')
      json(response, 200, { ok: true, code: 'HH_CONNECTED', manager_id: context.managerId,
        employer_id: context.employerId })
      void runCycle()
    } catch (_) { json(response, 503, { ok: false, code: 'HH_CALLBACK_FAILED' }) }
  }

  async function webhook(request, response, receiver) {
    if (!webhookEnabled() || state.schema !== 'ready' || request.method !== 'POST') {
      return json(response, 404, { ok: false })
    }
    try {
      const key = encryptionKey(env)
      if (!fixedEqual(receiver, signReceiver('hh-ru-employer', key))) return json(response, 404, { ok: false })
      let raw = ''
      for await (const chunk of request) {
        raw += chunk
        if (Buffer.byteLength(raw) > 65536) return json(response, 413, { ok: false })
      }
      const body = JSON.parse(raw)
      const callbackId = String(body.id || '')
      const eventType = String(body.action_type || '')
      const suppliedSubscriptionId = String(body.subscription_id || body.subscription?.id || '')
      const payload = body.payload || {}
      const connection = await store.connection()
      if (!callbackId || eventType !== 'NEW_NEGOTIATION_VACANCY' || !connection?.webhook_subscription_id ||
          suppliedSubscriptionId !== connection.webhook_subscription_id ||
          String(body.user_id || '') !== String(connection.manager_id || '') ||
          String(payload.employer_id || '') !== '1702778' ||
          String(payload.vacancy_id || '') !== '136455388') {
        return json(response, 400, { ok: false })
      }
      const subscriptionId = connection.webhook_subscription_id
      const result = await store.webhookEvent({ applicationId: APPLICATION_ID, subscriptionId, callbackId,
        payloadHash: sha256(raw), eventType, vacancyId: String(payload.vacancy_id), negotiationId: null })
      if (result === 'conflict') return json(response, 409, { ok: false })
      if (result === 'duplicate') return json(response, 200, { ok: true, duplicate: true })
      json(response, 200, { ok: true })
      void runCycle()
    } catch (_) { json(response, 503, { ok: false }) }
  }

  async function handle(request, response) {
    const url = new URL(request.url, 'https://runtime.local')
    if (url.pathname === '/integrations/hh/health' && request.method === 'GET') {
      return json(response, 200, { ok: true, enabled: enabled(), schema: state.schema,
        connection: state.connection, sync: state.sync, last_sync: state.lastSync,
        last_error_code: state.lastError, counts: state.lastCounts || null })
    }
    if (url.pathname === '/integrations/hh/oauth/start' && request.method === 'GET') return oauthStart(request, response)
    if (url.pathname === '/integrations/hh/oauth/callback' && request.method === 'GET') return oauthCallback(request, response, url)
    const prefix = '/integrations/hh/webhook/'
    if (url.pathname.startsWith(prefix)) return webhook(request, response, url.pathname.slice(prefix.length))
    json(response, 404, { ok: false })
  }

  return { start, handle, runCycle, state }
}

module.exports = { createHHRuntime, tokenExpiry, validTokenResponse }
