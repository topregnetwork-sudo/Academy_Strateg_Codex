const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Pool } = require('pg');
const { databaseConfig, yandexDiskConfig, liveGates } = require('./lib/batman-runtime-config');
const { createStorageRepository, runStorageWorkerOnce } = require('./lib/batman-storage-worker');
const { createSyntheticTelegramRepository, syntheticRoundTrip } = require('./lib/batman-telegram-synthetic');
const { ensurePrivateFolder, listFolder, uploadFile, publishResource } = require('./lib/yandex-disk');

const port = Number(process.env.PORT || 8080);
const host = '0.0.0.0';
const runtimeState = {
  database: 'pending',
  storageWorker: 'pending',
  lastOperationId: null,
  startedAt: new Date().toISOString(),
};

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

const server = http.createServer((request, response) => {
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
});
