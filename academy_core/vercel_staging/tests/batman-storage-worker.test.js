const test = require('node:test')
const assert = require('node:assert/strict')
const { databaseConfig, liveGates } = require('../lib/batman-runtime-config')
const { ensurePrivateFolder } = require('../lib/yandex-disk')
const { processStorageJob, resolveStoragePath, runStorageWorkerOnce } = require('../lib/batman-storage-worker')

function response(status, body = '') {
  return new Response(body ? JSON.stringify(body) : '', {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

test('all new runtime gates default closed', () => {
  assert.deepEqual(liveGates({}), {
    storageWorker: false,
    telegramIngest: false,
    telegramSend: false,
    zoom: false,
    referralIssue: false,
    realPii: false,
  })
})

test('database requires a verified CA and does not disable TLS verification', () => {
  assert.throws(() => databaseConfig({}), /batman_database_url_not_configured/)
  const ca = Buffer.from('-----BEGIN CERTIFICATE-----\nsynthetic\n-----END CERTIFICATE-----').toString('base64')
  const config = databaseConfig({ BATMAN_DATABASE_URL: 'postgresql://synthetic.invalid/db', BATMAN_DATABASE_CA_PEM_BASE64: ca })
  assert.equal(config.ssl.rejectUnauthorized, true)
  assert.match(config.ssl.ca, /BEGIN CERTIFICATE/)
})

test('resolves an outbox path below the protected storage root exactly once', () => {
  const root = 'Academy Strateg — защищённое хранилище'
  const relative = '00 Кандидаты — именные папки/Синтетический кандидат — HR-0143'
  const resolved = `${root}/${relative}`
  assert.equal(resolveStoragePath(root, relative), resolved)
  assert.equal(resolveStoragePath(root, resolved), resolved)
})

test('creates one private folder and proves exact path by readback', async () => {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), method: options.method, auth: options.headers.Authorization })
    if (options.method === 'PUT') return response(201)
    return response(200, {
      name: 'Синтетический кандидат — HR-0143',
      path: 'disk:/00 Кандидаты — именные папки/Синтетический кандидат — HR-0143',
      type: 'dir',
      resource_id: 'synthetic-resource-id',
    })
  }
  const result = await ensurePrivateFolder('00 Кандидаты — именные папки/Синтетический кандидат — HR-0143', 'synthetic-oauth', fetchImpl)
  assert.equal(result.created, true)
  assert.equal(result.resourceId, 'synthetic-resource-id')
  assert.equal(calls.length, 2)
  assert.ok(calls.every((call) => call.auth === 'OAuth synthetic-oauth'))
})

test('existing folder is idempotent and still requires readback', async () => {
  let count = 0
  const result = await ensurePrivateFolder('00 Кандидаты — именные папки/Синтетический кандидат — HR-0143', 'synthetic-oauth', async (_url, options) => {
    count += 1
    if (options.method === 'PUT') return response(409, { error: 'DiskPathPointsToExistentDirectoryError' })
    return response(200, {
      name: 'Синтетический кандидат — HR-0143',
      path: 'disk:/00 Кандидаты — именные папки/Синтетический кандидат — HR-0143',
      type: 'dir',
      resource_id: 'synthetic-resource-id',
    })
  })
  assert.equal(result.existed, true)
  assert.equal(count, 2)
})

test('worker marks a synthetic folder delivered only after readback', async () => {
  const transitions = []
  const job = {
    id: 'outbox-synthetic-1',
    profile_id: 'profile-synthetic-1',
    operation: 'create_candidate_folder',
    folder_path: '00 Кандидаты — именные папки/Синтетический кандидат — HR-0143',
    attempt_count: 1,
  }
  const repository = {
    async leaseNext() { return job },
    async markFolderDelivered(receivedJob, resource) { transitions.push({ state: 'delivered', receivedJob, resource }) },
    async markFailed(receivedJob, error) { transitions.push({ state: 'failed', receivedJob, error }) },
  }
  const result = await runStorageWorkerOnce({
    repository,
    oauthToken: 'synthetic-oauth',
    rootPath: 'Academy Strateg — защищённое хранилище',
    fetchImpl: async (_url, options) => options.method === 'PUT' ? response(201) : response(200, {
      name: 'Синтетический кандидат — HR-0143',
      path: 'disk:/Academy Strateg — защищённое хранилище/00 Кандидаты — именные папки/Синтетический кандидат — HR-0143',
      type: 'dir',
      resource_id: 'synthetic-resource-id',
    }),
  })
  assert.equal(result.state, 'delivered')
  assert.equal(result.readback, true)
  assert.equal(transitions.length, 1)
  assert.equal(transitions[0].state, 'delivered')
})

test('worker records a bounded error without exposing response bodies', async () => {
  const transitions = []
  const job = {
    id: 'outbox-synthetic-2', profile_id: 'profile-synthetic-2',
    operation: 'create_candidate_folder', folder_path: '00 Кандидаты — именные папки/Ошибка', attempt_count: 1,
  }
  const repository = {
    async markFolderDelivered() { throw new Error('must_not_deliver') },
    async markFailed(_job, error) { transitions.push(error) },
  }
  const result = await processStorageJob({
    job, repository, oauthToken: 'synthetic-oauth', rootPath: 'Academy Strateg — защищённое хранилище',
    fetchImpl: async () => response(401, { error: 'UnauthorizedError', description: 'secret body must not be persisted' }),
  })
  assert.equal(result.state, 'failed')
  assert.equal(transitions[0], 'unauthorizederror')
  assert.doesNotMatch(transitions[0], /secret/)
})
