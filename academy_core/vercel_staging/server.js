const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Pool } = require('pg');
const { databaseConfig, yandexDiskConfig, liveGates } = require('./lib/batman-runtime-config');
const { createStorageRepository, runStorageWorkerOnce } = require('./lib/batman-storage-worker');
const { createSyntheticTelegramRepository, syntheticRoundTrip } = require('./lib/batman-telegram-synthetic');
const { ensurePrivateFolder, listFolder, getUploadLink, uploadFile, publishResource } = require('./lib/yandex-disk');
const { createTildaIntakeRepository } = require('./lib/tilda-event-intake');
const tildaRoutingRegistry = require('./config/tilda-event-routing.v1.json');

const port = Number(process.env.PORT || 8080);
const host = '0.0.0.0';
const runtimeState = {
  database: 'pending',
  storageWorker: 'pending',
  lastOperationId: null,
  tildaSelftest: 'disabled',
  tildaSelftestReadback: null,
  startedAt: new Date().toISOString(),
};

async function runTildaSelftest() {
  if (!liveGates(process.env).tildaSelftest) return;
  runtimeState.tildaSelftest = 'running';
  const pool = new Pool(databaseConfig(process.env));
  try {
    const migration = fs.readFileSync(path.join(__dirname, 'migrations', '0010_tilda_event_intake.sql'), 'utf8');
    await pool.query(migration);
    const registry = {
      ...tildaRoutingRegistry,
      global_enabled: true,
      telegram_sender: { ...tildaRoutingRegistry.telegram_sender, membership_and_send_permission_verified: true },
      events: tildaRoutingRegistry.events.map((event) => ({ ...event, enabled: true })),
    };
    const repository = createTildaIntakeRepository(pool, registry);
    const routes = registry.events.map((route) => ({
      route,
      input: {
        project_id: route.tilda_project_id,
        form_id: route.form_id,
        transaction_id: `tilda-intake-103-selftest-${route.city_id}`,
        identity_key: `synthetic:${route.city_id}`,
      },
    }));
    const testProbe = await repository.ingest({ ...routes[0].input, transaction_id: 'tilda-intake-103-test-probe', test: true });
    if (testProbe.effects !== 0 || testProbe.registrations !== 0) throw new Error('test_probe_created_effects');
    const evidence = [];
    for (const item of routes) {
      await repository.ingest(item.input, { mirrorEnabled: false });
      const replay = await repository.ingest(item.input, { mirrorEnabled: false });
      const rows = await repository.readback(item.input.transaction_id);
      if (!replay.duplicate || rows.length !== 1) throw new Error(`dedupe_failed_${item.route.city_id}`);
      const row = rows[0];
      if (row.event_code !== item.route.event_id || row.chat_id !== item.route.telegram_chat_id || Number(row.message_thread_id) !== item.route.message_thread_id) throw new Error(`route_isolation_failed_${item.route.city_id}`);
      if (row.delivery_state !== 'held' || Number(row.delivery_attempts) !== 0 || row.telegram_message_id !== null) throw new Error(`outbox_not_held_${item.route.city_id}`);
      const payloadKeys = Object.keys(row.payload || {}).sort();
      if (payloadKeys.some((key) => ['name','email','phone','identity_key'].includes(key))) throw new Error(`outbox_pii_detected_${item.route.city_id}`);
      evidence.push({ event_id: row.event_code, city_id: item.route.city_id, form_id: row.form_id, chat_id: row.chat_id, message_thread_id: Number(row.message_thread_id), delivery_state: row.delivery_state, delivery_attempts: Number(row.delivery_attempts), rows: rows.length, replay_duplicate: true, pii_free: true });
    }
    let wrongFormRejected = false;
    try { await repository.ingest({ ...routes[0].input, form_id: 'not-allowlisted', transaction_id: 'tilda-intake-103-wrong-form' }); } catch (error) { wrongFormRejected = error.message === 'form_not_allowed'; }
    if (!wrongFormRejected) throw new Error('wrong_form_not_rejected');
    runtimeState.database = 'ready';
    runtimeState.tildaSelftest = 'passed';
    runtimeState.tildaSelftestReadback = { migration: '0010_tilda_event_intake', public_intake_enabled: liveGates(process.env).tildaIntake, telegram_mirror_enabled: liveGates(process.env).tildaTelegramMirror, test_probe_effects: 0, wrong_form_rejected: true, routes: evidence };
  } catch (error) {
    runtimeState.tildaSelftest = 'failed';
    runtimeState.tildaSelftestReadback = { code: String(error?.code || error?.message || 'selftest_failed').slice(0, 120) };
    console.error('tilda_intake_selftest_failed', runtimeState.tildaSelftestReadback.code);
  } finally { await pool.end(); }
}

async function runBoundedWorker() {
  if (!liveGates(process.env).storageWorker) {
    runtimeState.storageWorker = 'disabled';
    return;
  }

  const pool = new Pool(databaseConfig(process.env));
  try {
    await pool.query('select 1');
    runtimeState.database = 'ready';
    const repository = createStorageRepository(pool);
    const disk = yandexDiskConfig(process.env);
    const result = await runStorageWorkerOnce({
      repository,
      oauthToken: disk.oauthToken,
      rootPath: disk.rootPath,
    });
    runtimeState.storageWorker = result?.state || 'idle';
    runtimeState.lastOperationId = result?.jobId || null;
  } catch (error) {
    runtimeState.database = runtimeState.database === 'ready' ? 'ready' : 'failed';
    runtimeState.storageWorker = 'failed';
    console.error('batman_storage_worker_failed', error instanceof Error ? error.message : 'unknown');
  } finally {
    await pool.end();
  }
}

function json(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

function authorized(request) {
  const supplied = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const expected = String(process.env.BATMAN_TELEGRAM_SYNTHETIC_API_KEY || '');
  return expected.length >= 24 && supplied === expected;
}

async function readJson(request) {
  let value = '';
  for await (const chunk of request) {
    value += chunk;
    if (value.length > 16384) throw new Error('request_too_large');
  }
  return JSON.parse(value || '{}');
}

async function readJsonWithRaw(request) {
  let raw = ''
  for await (const chunk of request) {
    raw += chunk
    if (raw.length > 16384) throw new Error('request_too_large')
  }
  return { raw, body: JSON.parse(raw || '{}') }
}

function transferPublicKey() {
  const encoded = String(process.env.BATMAN_STORAGE_TRANSFER_PUBLIC_KEY_PEM_BASE64 || '')
  if (!encoded) return null
  return crypto.createPublicKey(Buffer.from(encoded, 'base64').toString('utf8'))
}

function transferEnabled() {
  return String(process.env.BATMAN_STORAGE_TRANSFER_ENABLED || '').toLowerCase() === 'true' && transferPublicKey()
}

function verifiedTransferRequest(request, url, bodySha256 = '', bodySize = '') {
  const expires = String(url.searchParams.get('expires') || '')
  const nonce = String(url.searchParams.get('nonce') || '')
  const signature = String(request.headers['x-academy-signature'] || '')
  const resourcePath = String(url.searchParams.get('path') || '')
  const expiresNumber = Number(expires)
  if (!resourcePath || !nonce || !signature || !Number.isFinite(expiresNumber)) return false
  if (Math.abs(Date.now() - expiresNumber) > 5 * 60 * 1000) return false
  const canonical = [request.method, url.pathname, resourcePath, bodySha256, bodySize, expires, nonce].join('\n')
  try { return crypto.verify(null, Buffer.from(canonical), transferPublicKey(), Buffer.from(signature, 'base64')) } catch { return false }
}

async function readBoundedBody(request, expectedSize) {
  if (!Number.isSafeInteger(expectedSize) || expectedSize < 0 || expectedSize > 200 * 1024 * 1024) throw new Error('invalid_upload_size')
  const chunks = []
  let total = 0
  for await (const chunk of request) {
    total += chunk.length
    if (total > expectedSize || total > 200 * 1024 * 1024) throw new Error('request_too_large')
    chunks.push(chunk)
  }
  if (total !== expectedSize) throw new Error('upload_size_mismatch')
  return Buffer.concat(chunks)
}

async function handleStorageTransfer(request, response) {
  if (!transferEnabled()) return json(response, 404, { ok: false })
  const url = new URL(request.url, 'http://runtime.local')
  const resourcePath = String(url.searchParams.get('path') || '').replace(/^\/+/, '')
  const disk = yandexDiskConfig(process.env)
  try {
    const allowedRoot = String(disk.rootPath || '').replace(/^\/+|\/+$/g, '')
    if (!allowedRoot || (resourcePath !== allowedRoot && !resourcePath.startsWith(`${allowedRoot}/`))) {
      return json(response, 403, { ok: false, code: 'storage_path_outside_allowed_root' })
    }
    if (url.pathname === '/internal/storage-transfer/remote-upload' && request.method === 'PUT') {
      const expectedSize = Number(request.headers['x-content-size'])
      const expectedSha = String(request.headers['x-content-sha256'] || '').toLowerCase()
      const googleFileId = String(request.headers['x-google-file-id'] || '')
      const googleAccessToken = String(request.headers['x-google-access-token'] || '')
      if (!verifiedTransferRequest(request, url, expectedSha, String(expectedSize))) return json(response, 401, { ok: false })
      if (!googleFileId || !googleAccessToken) return json(response, 400, { ok: false, code: 'google_source_not_configured' })
      const sourceResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(googleFileId)}?alt=media&supportsAllDrives=true`, {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      })
      if (!sourceResponse.ok) throw new Error(`google_source_fetch_failed_${sourceResponse.status}`)
      const sourceSize = Number(sourceResponse.headers.get('content-length'))
      if (!Number.isSafeInteger(sourceSize) || sourceSize !== expectedSize) throw new Error('google_source_size_mismatch')
      const result = await uploadFile(resourcePath, sourceResponse.body, disk.oauthToken, fetch, expectedSize)
      const parentPath = resourcePath.split('/').slice(0, -1).join('/')
      const readback = await listFolder(parentPath, disk.oauthToken)
      const item = readback?._embedded?.items?.find((candidate) => candidate.path === `disk:/${resourcePath}`)
      if (!item || Number(item.size) !== expectedSize) throw new Error('upload_readback_mismatch')
      return json(response, 200, { ok: true, result, readback: item })
    }
    if (url.pathname === '/internal/storage-transfer/upload-link' && request.method === 'GET') {
      if (!verifiedTransferRequest(request, url)) return json(response, 401, { ok: false })
      return json(response, 200, { ok: true, result: await getUploadLink(resourcePath, disk.oauthToken) })
    }
    if (url.pathname === '/internal/storage-transfer/upload' && request.method === 'PUT') {
      const expectedSize = Number(request.headers['x-content-size'])
      const expectedSha = String(request.headers['x-content-sha256'] || '').toLowerCase()
      if (!verifiedTransferRequest(request, url, expectedSha, String(expectedSize))) return json(response, 401, { ok: false })
      const body = await readBoundedBody(request, expectedSize)
      const actualSha = crypto.createHash('sha256').update(body).digest('hex')
      if (actualSha !== expectedSha) return json(response, 400, { ok: false, code: 'upload_hash_mismatch' })
      const result = await uploadFile(resourcePath, body, disk.oauthToken)
      const parentPath = resourcePath.split('/').slice(0, -1).join('/')
      const readback = await listFolder(parentPath, disk.oauthToken)
      const item = readback?._embedded?.items?.find((candidate) => candidate.path === `disk:/${resourcePath}`)
      if (!item || Number(item.size) !== expectedSize) throw new Error('upload_readback_mismatch')
      return json(response, 200, { ok: true, result, readback: item })
    }
    if (!verifiedTransferRequest(request, url)) return json(response, 401, { ok: false })
    if (url.pathname === '/internal/storage-transfer/ensure-folder' && request.method === 'POST') {
      return json(response, 200, { ok: true, result: await ensurePrivateFolder(resourcePath, disk.oauthToken) })
    }
    if (url.pathname === '/internal/storage-transfer/list' && request.method === 'GET') {
      return json(response, 200, { ok: true, result: await listFolder(resourcePath, disk.oauthToken) })
    }
    if (url.pathname === '/internal/storage-transfer/publish' && request.method === 'POST') {
      return json(response, 200, { ok: true, result: await publishResource(resourcePath, disk.oauthToken) })
    }
    return json(response, 404, { ok: false })
  } catch (error) {
    console.error('storage_transfer_failed', String(error?.code || error?.message || 'request_failed').slice(0, 120))
    return json(response, 400, { ok: false, code: String(error?.code || error?.message || 'request_failed').slice(0, 120) })
  }
}

async function handleSyntheticTelegram(request, response) {
  const gates = liveGates(process.env);
  if (!gates.telegramSynthetic) return json(response, 404, { ok: false });
  if (!authorized(request)) return json(response, 401, { ok: false });
  const pool = new Pool(databaseConfig(process.env));
  try {
    if (request.url === '/internal/telegram/synthetic-migrate' && request.method === 'POST') {
      const sql = fs.readFileSync(path.join(__dirname, 'migrations', '0008_batman_telegram_synthetic_contract.sql'), 'utf8');
      await pool.query(sql);
      return json(response, 200, { ok: true, migration: '0008_batman_telegram_synthetic_contract' });
    }
    if (request.url !== '/internal/telegram/synthetic-round-trip' || request.method !== 'POST') {
      return json(response, 404, { ok: false });
    }
    const body = await readJson(request);
    const result = await syntheticRoundTrip({
      repository: createSyntheticTelegramRepository(pool),
      botKey: String(process.env.BATMAN_TELEGRAM_BOT_KEY || 'batman_synthetic'),
      botToken: String(process.env.BATMAN_TELEGRAM_BOT_TOKEN || ''),
      expectedChatId: String(process.env.BATMAN_TELEGRAM_SYNTHETIC_CHAT_ID || ''),
      campaignId: String(body.campaign_id || ''),
      update: body.update,
    });
    return json(response, 200, { ok: true, ...result });
  } catch (error) {
    console.error('batman_synthetic_telegram_failed', error instanceof Error ? error.message : 'unknown');
    return json(response, 400, { ok: false, code: String(error?.code || error?.message || 'request_failed').slice(0, 120) });
  } finally {
    await pool.end();
  }
}

async function handleTildaIntake(request, response) {
  const gates = liveGates(process.env)
  const url = new URL(request.url, 'http://runtime.local')
  const isSynthetic = url.pathname.startsWith('/internal/tilda-intake/')
  if (isSynthetic && !gates.tildaSynthetic) return json(response, 404, { ok: false })
  if (!isSynthetic && !gates.tildaIntake) return json(response, 404, { ok: false })
  const pool = new Pool(databaseConfig(process.env))
  try {
    if (isSynthetic && url.pathname === '/internal/tilda-intake/migrate' && request.method === 'POST') {
      if (!verifiedTransferRequest(request, url)) return json(response, 401, { ok: false })
      const migration = fs.readFileSync(path.join(__dirname, 'migrations', '0010_tilda_event_intake.sql'), 'utf8')
      await pool.query(migration)
      return json(response, 200, { ok: true, migration: '0010_tilda_event_intake' })
    }
    if (isSynthetic && url.pathname === '/internal/tilda-intake/readback' && request.method === 'GET') {
      if (!verifiedTransferRequest(request, url)) return json(response, 401, { ok: false })
      const transactionId = String(url.searchParams.get('transaction_id') || '')
      const rows = await createTildaIntakeRepository(pool).readback(transactionId)
      return json(response, 200, { ok: true, transaction_id: transactionId, rows })
    }
    if (request.method !== 'POST') return json(response, 404, { ok: false })
    const { raw, body } = await readJsonWithRaw(request)
    if (isSynthetic) {
      const bodyHash = crypto.createHash('sha256').update(raw).digest('hex')
      if (!verifiedTransferRequest(request, url, bodyHash, String(Buffer.byteLength(raw)))) return json(response, 401, { ok: false })
    } else {
      const token = String(url.searchParams.get('token') || '')
      const expected = String(process.env.TILDA_INTAKE_TOKEN || '')
      if (expected.length < 24 || token !== expected) return json(response, 401, { ok: false })
    }
    const result = await createTildaIntakeRepository(pool).ingest(body, { mirrorEnabled: gates.tildaTelegramMirror })
    return json(response, 200, { ok: true, mirror_enabled: gates.tildaTelegramMirror, ...result })
  } catch (error) {
    console.error('tilda_event_intake_failed', String(error?.code || error?.message || 'request_failed').slice(0, 120))
    const code = String(error?.code || error?.message || 'request_failed').slice(0, 120)
    return json(response, code.endsWith('_not_allowed') ? 403 : 400, { ok: false, code })
  } finally { await pool.end() }
}

const server = http.createServer((request, response) => {
  if (request.url?.startsWith('/internal/tilda-intake/') || request.url?.startsWith('/api/intake/tilda-registration')) {
    void handleTildaIntake(request, response);
    return;
  }
  if (request.url?.startsWith('/internal/storage-transfer/')) {
    void handleStorageTransfer(request, response);
    return;
  }
  if (request.url?.startsWith('/internal/telegram/')) {
    void handleSyntheticTelegram(request, response);
    return;
  }
  if (request.url !== '/health') {
    json(response, 404, { ok: false });
    return;
  }

  json(response, 200, { ok: true, ...runtimeState });
});

server.listen(port, host, () => {
  console.log(`batman_runtime_listening:${port}`);
  void runBoundedWorker();
  void runTildaSelftest();
});
