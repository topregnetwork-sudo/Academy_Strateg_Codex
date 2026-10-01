const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { randomBytes } = require('node:crypto')
const http = require('node:http')
const { encryptionKey, seal, open, randomOpaque, challenge, safeApiUrl, signReceiver } = require('../lib/hh-security')
const { hhApi } = require('../lib/hh-api')
const { managerContext, verifyContext, metadataOnly, vacancyCity, discoverVacancies, syncVacancy } = require('../lib/hh-sync')
const { bridgeJob } = require('../lib/hh-telegram-bridge')
const { createHHRuntime } = require('../lib/hh-runtime')

const keyValue = randomBytes(32).toString('base64url')

test('token/verifier boxes authenticate ciphertext and never contain plaintext', () => {
  const key = encryptionKey({ HH_TOKEN_ENCRYPTION_KEY: keyValue })
  const box = seal('sensitive-token-value', key)
  assert.equal(JSON.stringify(box).includes('sensitive-token-value'), false)
  assert.equal(open(box, key), 'sensitive-token-value')
  assert.throws(() => open({ ...box, t: randomBytes(16).toString('base64url') }, key))
})

test('encryption key accepts only complete 32-byte hex or base64 representations', () => {
  const bytes = randomBytes(32)
  assert.deepEqual(encryptionKey({ HH_TOKEN_ENCRYPTION_KEY: bytes.toString('hex') }), bytes)
  assert.deepEqual(encryptionKey({ HH_TOKEN_ENCRYPTION_KEY: bytes.toString('base64url') }), bytes)
  assert.deepEqual(encryptionKey({ HH_TOKEN_ENCRYPTION_KEY: bytes.toString('base64') }), bytes)
  for (const invalid of ['', 'a'.repeat(63), 'g'.repeat(64), randomBytes(16).toString('hex'),
    randomBytes(31).toString('base64url'), randomBytes(33).toString('base64url')]) {
    assert.throws(() => encryptionKey({ HH_TOKEN_ENCRYPTION_KEY: invalid }), /HH_KEY_INVALID/)
  }
})

test('state/PKCE entropy and HH URL allowlist', () => {
  const verifier = randomOpaque()
  assert.equal(verifier.length, 43)
  assert.equal(challenge(verifier).length, 43)
  assert.equal(safeApiUrl('/me?host=hh.ru', '/me').hostname, 'api.hh.ru')
  assert.throws(() => safeApiUrl('https://evil.example/negotiations/a', '/negotiations/'))
  assert.throws(() => safeApiUrl('https://api.hh.ru.evil.example/negotiations/a', '/negotiations/'))
})

test('HH API transport never permits provider action methods from read path', async () => {
  const calls = []
  const api = hhApi({ HH_CLIENT_ID: 'id', HH_CLIENT_SECRET: 'secret', HH_API_USER_AGENT: 'Academy/1.0 (owner@example.com)' },
    async (url, options) => { calls.push([String(url), options.method]); return { ok: true, status: 200, json: async () => ({ id: '1' }) } })
  await api.get('/me?host=hh.ru', 'token', '/me')
  assert.deepEqual(calls, [['https://api.hh.ru/me?host=hh.ru', 'GET']])
  assert.equal(typeof api.authorizeUrl({ state: 's', challenge: 'c' }), 'string')
})

test('manager/employer identity remains fail-closed', () => {
  const valid = managerContext({ id: '42', last_name: 'Шипунов', first_name: 'Максим',
    middle_name: 'Александрович', employer: { id: '1702778', name: 'Альтеза' } })
  assert.equal(verifyContext(valid), true)
  assert.equal(verifyContext({ ...valid, employerId: 'other' }), false)
  assert.equal(verifyContext({ ...valid, managerName: 'Другой Пользователь' }), false)
})

test('metadata projection excludes raw resume, contact, actions and messages', () => {
  const value = metadataOnly({ id: '123', resume: { id: 'r1', first_name: 'PII', phone: '123' },
    actions: [{ method: 'PUT' }], messages: [{ text: 'secret text' }], state: { id: 'response' } })
  assert.deepEqual(value.resume, { id: 'r1' })
  assert.equal(JSON.stringify(value).includes('PII'), false)
  assert.equal(JSON.stringify(value).includes('secret text'), false)
  assert.equal(JSON.stringify(value).includes('PUT'), false)
})

test('manager-authorized vacancy inventory classifies Chelyabinsk before negotiation reads', async () => {
  const saved = []
  const calls = []
  const api = { get: async url => {
    const value = String(url)
    calls.push(value)
    if (value.startsWith('/employers/')) {
      const status = value.split('/')[4].split('?')[0]
      return { page: 0, pages: 1, items: status === 'active' ? [{ id: '136453079' }, { id: '900' }] : [] }
    }
    const id = value.match(/^\/vacancies\/(\d+)/)?.[1]
    if (id) return { id, employer: { id: '1702778' },
      area: { id: id === '136455388' ? '1002' : id === '136453079' ? '104' : '1',
        name: id === '136455388' ? 'Минск' : id === '136453079' ? 'Челябинск' : 'Москва' } }
    throw new Error(`unexpected ${value}`)
  } }
  const scope = await discoverVacancies({ api, token: 'opaque', store: { saveVacancy: async x => saved.push(x) } })
  assert.deepEqual(scope.included, ['136455388', '136453079'])
  assert.deepEqual(scope.classes, { CHELYABINSK_PROVEN: 1, OTHER: 2, UNKNOWN: 0 })
  assert.equal(saved.find(x => x.vacancyId === '136453079').classification, 'CHELYABINSK_PROVEN')
  assert.equal(calls.some(x => x.startsWith('/negotiations')), false)
  assert.equal(vacancyCity({ area: { name: 'Челябинская область' } }), 'OTHER')
})

test('Chelyabinsk anchor without provider city proof fails closed', async () => {
  const api = { get: async url => String(url).startsWith('/employers/')
    ? { page: 0, pages: 1, items: [] }
    : { id: String(url).match(/^\/vacancies\/(\d+)/)[1], employer: { id: '1702778' } } }
  await assert.rejects(discoverVacancies({ api, token: 'opaque', store: { saveVacancy: async () => {} } }),
    /HH_CHELYABINSK_ANCHOR_UNPROVEN/)
})

test('full collection pagination and repeated snapshot create zero new rows through checkpoint replay', async () => {
  const saved = new Set()
  const store = {
    saveVacancy: async () => {}, markSync: async () => {},
    savePage: async ({ collectionId, page, items }) => {
      const key = `${collectionId}:${page}`
      if (saved.has(key)) return { replay: true, inserted: 0 }
      saved.add(key)
      return { replay: false, inserted: items.length }
    },
  }
  const api = { get: async (url) => {
    const path = String(url)
    if (path.startsWith('/vacancies/')) return { id: '136455388', employer: { id: '1702778' }, archived: true }
    if (path.startsWith('/negotiations?')) return { collections: [
      { id: 'response', url: 'https://api.hh.ru/negotiations/response?vacancy_id=136455388' },
      { id: 'invited', url: 'https://api.hh.ru/negotiations/invited?vacancy_id=136455388' },
    ] }
    if (path.includes('page=')) {
      const u = new URL(path)
      const page = Number(u.searchParams.get('page'))
      const id = `${u.pathname.split('/').at(-1)}-${page}`
      return { page, pages: 2, found: 2, items: [{ id, url: `https://api.hh.ru/negotiations/${id}` }] }
    }
    return { id: path.split('/').at(-1), state: { id: 'response' } }
  } }
  const first = await syncVacancy({ api, token: 'opaque', store })
  const repeat = await syncVacancy({ api, token: 'opaque', store })
  assert.equal(first.pagesRead, 4)
  assert.equal(first.inserted, 4)
  assert.equal(repeat.inserted, 0)
})

test('HH bridge contains only bounded IDs and never calls Telegram transport', () => {
  const job = bridgeJob({ employerId: '1702778', vacancyId: '136455388', negotiationId: '123' })
  assert.equal(job.deliveryState, 'awaiting_identity')
  assert.equal(job.personId, null)
  assert.deepEqual(job, bridgeJob({ employerId: '1702778', vacancyId: '136455388', negotiationId: '123' }))
  const lib = path.join(__dirname, '..', 'lib')
  for (const file of ['hh-api.js','hh-runtime.js','hh-store.js','hh-sync.js','hh-telegram-bridge.js']) {
    const source = fs.readFileSync(path.join(lib, file), 'utf8')
    assert.equal(source.includes('api.telegram.org'), false)
    assert.equal(source.includes("require('./telegram-bot')"), false)
  }
})

test('HH worker disabled does not create requests or alter independent Telegram files', async () => {
  let calls = 0
  const fakePool = { connect: async () => { calls++; throw new Error('unexpected') } }
  const runtime = createHHRuntime({ HH_OAUTH_ENABLED: 'false' }, { pool: fakePool, store: {} })
  await runtime.start()
  await runtime.runCycle()
  assert.equal(calls, 0)
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'lib', 'telegram-bot.js')), true)
})

test('production OAuth callback consumes state once and exposes no token or code', async () => {
  let session
  let consumed = false
  let tokenCalls = 0
  const fakePool = {
    query: async (sql, args) => {
      if (String(sql).includes('insert into hh_oauth_sessions')) session = args
      return { rows: [], rowCount: 1 }
    },
    connect: async () => ({ query: async () => ({ rows: [{ acquired: true }] }), release: () => {} }),
  }
  const fakeStore = {
    connection: async () => null,
    consumeSession: async (stateHash, browserHash) => {
      if (consumed || stateHash !== session?.[0] || browserHash !== session?.[1]) return null
      consumed = true
      return { verifier_box: session[2] }
    },
    saveToken: async () => {},
    verifyManager: async () => true,
  }
  const fakeFetch = async (url) => {
    const pathname = new URL(String(url)).pathname
    if (pathname === '/token') {
      tokenCalls++
      return { ok: true, status: 200, json: async () => ({ access_token: 'a'.repeat(30),
        refresh_token: 'r'.repeat(30), expires_in: 3600 }) }
    }
    if (pathname === '/me') return { ok: true, status: 200, json: async () => ({ id: '42',
      last_name: 'Шипунов', first_name: 'Максим', middle_name: 'Александрович',
      employer: { id: '1702778', name: 'Альтеза' } }) }
    throw new Error('unexpected provider request')
  }
  const runtime = createHHRuntime({ HH_OAUTH_ENABLED: 'true', HH_SCHEMA_MIGRATE_ON_START: 'true',
    HH_CLIENT_ID: 'client-id', HH_CLIENT_SECRET: 'client-secret', HH_TOKEN_ENCRYPTION_KEY: keyValue,
    HH_API_USER_AGENT: 'Academy/1.0 (owner@example.com)' },
  { pool: fakePool, store: fakeStore, fetch: fakeFetch })
  await runtime.start()
  const server = http.createServer((req, res) => { void runtime.handle(req, res) })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const origin = `http://127.0.0.1:${server.address().port}`
    const start = await fetch(`${origin}/integrations/hh/oauth/start`, { redirect: 'manual' })
    assert.equal(start.status, 302)
    const state = new URL(start.headers.get('location')).searchParams.get('state')
    const cookie = start.headers.get('set-cookie').split(';')[0]
    const callbackUrl = `${origin}/integrations/hh/oauth/callback?state=${state}&code=opaque-code-12345`
    const callback = await fetch(callbackUrl, { headers: { cookie } })
    const body = await callback.text()
    assert.equal(callback.status, 200)
    assert.equal(body.includes('opaque-code-12345'), false)
    assert.equal(body.includes('a'.repeat(30)), false)
    const replay = await fetch(callbackUrl, { headers: { cookie } })
    assert.equal(replay.status, 400)
    assert.equal(tokenCalls, 1)
  } finally { server.close() }
})

test('official HH callback shape is scoped and duplicate delivery is idempotent', async () => {
  const events = new Set()
  const store = {
    connection: async () => ({ manager_id: '42', webhook_subscription_id: 'sub-1' }),
    inScopeVacancy: async vacancyId => vacancyId === '136455388' || vacancyId === '136453079',
    webhookEvent: async ({ callbackId, vacancyId, negotiationId }) => {
      assert.equal(vacancyId, '136455388')
      assert.equal(negotiationId, null)
      if (events.has(callbackId)) return 'duplicate'
      events.add(callbackId)
      return 'accepted'
    },
  }
  const runtime = createHHRuntime({ HH_OAUTH_ENABLED: 'true', HH_WEBHOOK_ENABLED: 'true',
    HH_TOKEN_ENCRYPTION_KEY: keyValue }, { pool: {}, store })
  runtime.state.schema = 'ready'
  const receiver = signReceiver('hh-ru-employer', encryptionKey({ HH_TOKEN_ENCRYPTION_KEY: keyValue }))
  const server = http.createServer((req, res) => { void runtime.handle(req, res) })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const url = `http://127.0.0.1:${server.address().port}/integrations/hh/webhook/${receiver}`
    const event = { action_type: 'NEW_NEGOTIATION_VACANCY', id: 'event-1',
      subscription_id: 'sub-1', user_id: '42', payload: { employer_id: '1702778',
        vacancy_id: '136455388', resume_id: 'private-provider-id' } }
    const post = payload => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload) })
    assert.equal((await post(event)).status, 200)
    const duplicate = await post(event)
    assert.equal(duplicate.status, 200)
    assert.equal((await duplicate.json()).duplicate, true)
    assert.equal(events.size, 1)
    assert.equal((await post({ ...event, payload: { ...event.payload, vacancy_id: 'other' } })).status, 400)
    assert.equal(events.size, 1)
  } finally { server.close() }
})
