function required(env, name) {
  const value = String(env?.[name] || '').trim()
  if (!value) throw new Error(`${name.toLowerCase()}_not_configured`)
  return value
}

function decodeCa(base64) {
  try {
    const pem = Buffer.from(base64, 'base64').toString('utf8').trim()
    if (!pem.includes('BEGIN CERTIFICATE')) throw new Error('invalid_ca')
    return pem
  } catch {
    throw new Error('batman_database_ca_invalid')
  }
}

function databaseConfig(env = process.env) {
  return {
    connectionString: required(env, 'BATMAN_DATABASE_URL'),
    ssl: {
      ca: decodeCa(required(env, 'BATMAN_DATABASE_CA_PEM_BASE64')),
      rejectUnauthorized: true,
    },
    application_name: 'academy-batman-runtime',
    max: Number(env.BATMAN_DATABASE_POOL_MAX || 5),
    connectionTimeoutMillis: Number(env.BATMAN_DATABASE_CONNECT_TIMEOUT_MS || 10000),
    idleTimeoutMillis: Number(env.BATMAN_DATABASE_IDLE_TIMEOUT_MS || 30000),
  }
}

function yandexDiskConfig(env = process.env) {
  return {
    oauthToken: required(env, 'YANDEX_DISK_OAUTH_TOKEN'),
    rootPath: String(env.YANDEX_DISK_CANDIDATE_ROOT || '00 Кандидаты — именные папки').trim(),
  }
}

function liveGates(env = process.env) {
  return {
    storageWorker: env.BATMAN_STORAGE_WORKER_ENABLED === 'true',
    telegramIngest: env.BATMAN_TELEGRAM_INGEST_ENABLED === 'true',
    telegramSend: env.BATMAN_TELEGRAM_SEND_ENABLED === 'true',
    zoom: env.BATMAN_ZOOM_ENABLED === 'true',
    referralIssue: env.BATMAN_REFERRAL_ISSUE_ENABLED === 'true',
    realPii: env.BATMAN_REAL_PII_ENABLED === 'true',
    telegramSynthetic: env.BATMAN_TELEGRAM_SYNTHETIC_ENABLED === 'true',
    tildaIntake: env.TILDA_INTAKE_ENABLED === 'true',
    tildaSynthetic: env.TILDA_INTAKE_SYNTHETIC_ENABLED === 'true',
    tildaSelftest: env.TILDA_INTAKE_SELFTEST_ENABLED === 'true',
    tildaTelegramMirror: env.TILDA_TELEGRAM_MIRROR_ENABLED === 'true',
  }
}

module.exports = { databaseConfig, yandexDiskConfig, liveGates }
