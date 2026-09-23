const http = require('node:http');
const { Pool } = require('pg');
const { loadBatmanDatabaseConfig, loadYandexDiskConfig } = require('./lib/batman-runtime-config');
const { createPostgresStorageRepository, runStorageWorkerOnce } = require('./lib/batman-storage-worker');
const { createYandexDiskClient } = require('./lib/yandex-disk');

const port = Number(process.env.PORT || 8080);
const host = '0.0.0.0';
const runtimeState = {
  database: 'pending',
  storageWorker: 'pending',
  lastOperationId: null,
  startedAt: new Date().toISOString(),
};

async function runBoundedWorker() {
  if (process.env.BATMAN_STORAGE_WORKER_ENABLED !== 'true') {
    runtimeState.storageWorker = 'disabled';
    return;
  }

  const pool = new Pool(loadBatmanDatabaseConfig(process.env));
  try {
    await pool.query('select 1');
    runtimeState.database = 'ready';
    const repository = createPostgresStorageRepository(pool);
    const disk = createYandexDiskClient(loadYandexDiskConfig(process.env));
    const result = await runStorageWorkerOnce({ repository, disk });
    runtimeState.storageWorker = result ? result.deliveryState : 'idle';
    runtimeState.lastOperationId = result?.operationId || null;
  } catch (error) {
    runtimeState.database = runtimeState.database === 'ready' ? 'ready' : 'failed';
    runtimeState.storageWorker = 'failed';
    console.error('batman_storage_worker_failed', error instanceof Error ? error.message : 'unknown');
  } finally {
    await pool.end();
  }
}

const server = http.createServer((request, response) => {
  if (request.url !== '/health') {
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: false }));
    return;
  }

  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ ok: true, ...runtimeState }));
});

server.listen(port, host, () => {
  console.log(`batman_runtime_listening:${port}`);
  void runBoundedWorker();
});
