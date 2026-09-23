const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
const { databaseConfig, yandexDiskConfig, liveGates } = require('./lib/batman-runtime-config');
const { createStorageRepository, runStorageWorkerOnce } = require('./lib/batman-storage-worker');
const { createSyntheticTelegramRepository, syntheticRoundTrip } = require('./lib/batman-telegram-synthetic');

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
