const { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } = require('node:crypto')

const HH_REDIRECT_URI = 'https://topregnetwork-sudo-academy-strateg-codex-59ae.twc1.net/integrations/hh/oauth/callback'
const HH_HOST = 'hh.ru'
const HH_API_ORIGIN = 'https://api.hh.ru'
const HH_SESSION_TTL_MS = 10 * 60 * 1000

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex')
}

function fixedEqual(a, b) {
  const left = Buffer.from(String(a || ''))
  const right = Buffer.from(String(b || ''))
  return left.length === right.length && timingSafeEqual(left, right)
}

function encryptionKey(env) {
  const raw = String(env.HH_TOKEN_ENCRYPTION_KEY || '')
  if (!/^[A-Za-z0-9_-]{43}$/.test(raw) && !/^[A-Za-z0-9+/]{43}=$/.test(raw)) throw new Error('HH_KEY_INVALID')
  const key = Buffer.from(raw, raw.includes('-') || raw.includes('_') ? 'base64url' : 'base64')
  if (key.length !== 32) throw new Error('HH_KEY_INVALID')
  return key
}

function seal(value, key, entropy = randomBytes) {
  const nonce = entropy(12)
  const cipher = createCipheriv('aes-256-gcm', key, nonce)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return { v: 1, n: nonce.toString('base64url'), c: encrypted.toString('base64url'), t: cipher.getAuthTag().toString('base64url') }
}

function open(box, key) {
  if (!box || box.v !== 1 || !box.n || !box.c || !box.t) throw new Error('HH_BOX_INVALID')
  const nonce = Buffer.from(box.n, 'base64url')
  const tag = Buffer.from(box.t, 'base64url')
  if (nonce.length !== 12 || tag.length !== 16) throw new Error('HH_BOX_INVALID')
  const decipher = createDecipheriv('aes-256-gcm', key, nonce)
  decipher.setAuthTag(tag)
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(box.c, 'base64url')), decipher.final()]).toString('utf8'))
}

function randomOpaque(bytes = 32, entropy = randomBytes) {
  const value = entropy(bytes)
  if (!Buffer.isBuffer(value) || value.length !== bytes) throw new Error('HH_ENTROPY_INVALID')
  return value.toString('base64url')
}

function challenge(verifier) {
  return createHash('sha256').update(verifier).digest('base64url')
}

function safeApiUrl(candidate, expectedPathPrefix = '/') {
  const url = new URL(candidate, HH_API_ORIGIN)
  if (url.origin !== HH_API_ORIGIN || url.username || url.password || url.hash || !url.pathname.startsWith(expectedPathPrefix)) {
    throw new Error('HH_API_URL_REJECTED')
  }
  return url
}

function signReceiver(receiverId, key) {
  return createHmac('sha256', key).update(`hh-receiver-v1:${receiverId}`).digest('hex')
}

module.exports = {
  HH_REDIRECT_URI, HH_HOST, HH_API_ORIGIN, HH_SESSION_TTL_MS,
  sha256, fixedEqual, encryptionKey, seal, open, randomOpaque, challenge, safeApiUrl, signReceiver,
}
