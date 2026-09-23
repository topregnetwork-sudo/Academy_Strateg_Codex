const http = require('node:http');
const { Pool } = require('pg');
const { databaseConfig, yandexDiskConfig, liveGates } = require('./lib/batman-runtime-config');
const { createStorageRepository, runStorageWorkerOnce } = require('./lib/batman-storage-worker');

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
