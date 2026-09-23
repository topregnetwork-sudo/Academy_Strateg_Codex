const { Pool } = require('pg')
const { databaseConfig, yandexDiskConfig, liveGates } = require('../lib/batman-runtime-config')
const { createStorageRepository, runStorageWorkerOnce } = require('../lib/batman-storage-worker')

async function main() {
  const gates = liveGates(process.env)
  if (!gates.storageWorker) throw new Error('batman_storage_worker_disabled')
  const dbConfig = databaseConfig(process.env)
  const diskConfig = yandexDiskConfig(process.env)
  const pool = new Pool(dbConfig)
  try {
    const repository = createStorageRepository(pool)
    const result = await runStorageWorkerOnce({ repository, oauthToken: diskConfig.oauthToken })
    process.stdout.write(`${JSON.stringify(result)}\n`)
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({ state: 'error', code: String(error.message || error) })}\n`)
  process.exitCode = 1
})
