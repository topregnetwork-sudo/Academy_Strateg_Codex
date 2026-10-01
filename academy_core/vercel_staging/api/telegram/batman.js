const { readFileSync } = require('node:fs')
const { Pool } = require('pg')
const { CONTRACT, createPreviewRuntime } = require('../../lib/batman-route-contract')
const { databaseConfig, liveGates, runtimeBindingStatus, run01TelegramBindingStatus } = require('../../lib/batman-runtime-config')
const { createRun01Repository, runOwnerOnlyRun01 } = require('../../lib/batman-run01')
const { diagnosePrivateChat } = require('../../lib/telegram-bot')

const runtime = createPreviewRuntime()

function authorized(req) {
  const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const expected = String(process.env.BATMAN_TELEGRAM_SYNTHETIC_API_KEY || '')
  return expected.length >= 24 && supplied === expected
}

function safeCode(error) {
  return String(error?.code || error?.message || 'run01_failed')
    .toLowerCase().replace(/[^a-z0-9_.-]+/g, '_').slice(0, 120)
}

async function applyMigrations(pool) {
  const applied = []
  for (const id of ['0006_batman_online_core','0007_batman_candidate_storage','0008_batman_telegram_synthetic_contract']) {
    const file = readFileSync(require.resolve(`../../migrations/${id}.sql`), 'utf8')
    await pool.query(file)
    applied.push(id)
  }
  const readback = await pool.query(`
    select migration_id from schema_migrations
    where migration_id=any($1::text[]) order by migration_id
  `, [applied])
  return { applied, registered: readback.rows.map((row) => row.migration_id) }
}

async function physicalRun01(req, res, body) {
  if (!authorized(req)) return res.status(401).json({ ok: false, code: 'authorization_required' })
  if (String(process.env.VERCEL_ENV || '').toLowerCase() !== 'preview') {
    return res.status(409).json({ ok: false, code: 'preview_environment_required' })
  }
  const gates = liveGates(process.env)
  const bindings = runtimeBindingStatus(process.env)
  const run01Bindings = run01TelegramBindingStatus(process.env)
  let pool
  try {
    pool = new Pool(databaseConfig(process.env))
    await pool.query('select 1')
    if (req.method === 'GET') return res.status(200).json({ ok: true, database: 'ready', gates, bindings, run01_bindings: run01Bindings })
    if (body.action === 'migrate') {
      const migration = await applyMigrations(pool)
      return res.status(200).json({ ok: true, database: 'ready', migration, values_exposed: false })
    }
    if (body.action === 'diagnose_owner_chat') {
      const diagnostic = await diagnosePrivateChat({
        botToken: String(process.env.BATMAN_TELEGRAM_BOT_TOKEN || ''),
        expectedChatId: String(process.env.BATMAN_TELEGRAM_SYNTHETIC_CHAT_ID || ''),
      })
      return res.status(200).json({ ok: true, diagnostic })
    }
    if (body.action === 'rollback_failed_run') {
      const rollback = await createRun01Repository(pool).rollbackFailed(body.run_id)
      return res.status(200).json({ ok: true, rollback, values_exposed: false })
    }
    if (body.action !== 'run') return res.status(400).json({ ok: false, code: 'action_invalid' })
    if (!gates.telegramSynthetic || !gates.telegramSend) return res.status(409).json({ ok: false, code: 'run01_live_gates_disabled' })
    if (!run01Bindings.ready) return res.status(409).json({ ok: false, code: 'run01_telegram_bindings_incomplete', run01_bindings: run01Bindings })
    const result = await runOwnerOnlyRun01({
      repository: createRun01Repository(pool),
      botKey: String(process.env.BATMAN_TELEGRAM_BOT_KEY || 'batman_owner_run01'),
      botToken: String(process.env.BATMAN_TELEGRAM_BOT_TOKEN || ''),
      expectedChatId: String(process.env.BATMAN_TELEGRAM_SYNTHETIC_CHAT_ID || ''),
      runId: body.run_id,
      update: body.update,
    })
    return res.status(200).json({ ok: true, ...result })
  } catch (error) {
    console.error('batman_owner_run01_failed', safeCode(error))
    return res.status(400).json({ ok: false, code: safeCode(error) })
  } finally {
    if (pool) await pool.end().catch(() => {})
  }
}

export default async function handler(req, res) {
  if (!['GET','POST'].includes(req.method)) return res.status(405).json({ ok: false, code: 'method_not_allowed' })
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  if (req.method === 'GET' || body.action === 'migrate' || body.action === 'diagnose_owner_chat' || body.action === 'rollback_failed_run' || body.action === 'run') return physicalRun01(req, res, body)
  if (body.preview !== true) return res.status(403).json({ ok: false, code: 'preview_only' })
  try {
    const result = runtime.process(body.update)
    return res.status(200).json({ ok: true, contract: CONTRACT, external_actions: false, telegram_send: false, ...result, snapshot: runtime.snapshot() })
  } catch (error) {
    return res.status(400).json({ ok: false, code: String(error?.message || 'invalid_update') })
  }
}

module.exports.applyMigrations = applyMigrations
