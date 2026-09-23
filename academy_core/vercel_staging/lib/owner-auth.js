const crypto = require('node:crypto')
const { readCookies, cookie, appendCookie } = require('./http')

const SESSION = 'academy_control_owner'

function sessionConfigured() {
  return Boolean(process.env.CONTROL_OWNER_EMAIL && process.env.CONTROL_SESSION_SECRET)
}
function vercelConfigured() {
  return Boolean(process.env.VERCEL_APP_CLIENT_ID && process.env.VERCEL_APP_CLIENT_SECRET && sessionConfigured() && process.env.CONTROL_APP_ORIGIN)
}
function passwordConfigured() {
  return Boolean(sessionConfigured() && process.env.CONTROL_OWNER_PASSWORD_HASH)
}

function encode(value) { return Buffer.from(JSON.stringify(value)).toString('base64url') }
function decode(value) {
  try { return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) } catch (_) { return null }
}
function signature(value) {
  return crypto.createHmac('sha256', process.env.CONTROL_SESSION_SECRET || '').update(value).digest('base64url')
}

function signedSession(email, subject) {
  const payload = encode({ email, subject, exp: Date.now() + 1000 * 60 * 60 * 12 })
  return `${payload}.${signature(payload)}`
}

function sessionFrom(request) {
  if (!sessionConfigured()) return null
  const value = readCookies(request)[SESSION]
  if (!value) return null
  const separator = value.lastIndexOf('.')
  if (separator < 1) return null
  const payload = value.slice(0, separator)
  const given = value.slice(separator + 1)
  const expected = signature(payload)
  const left = Buffer.from(given)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null
  const parsed = decode(payload)
  if (!parsed || parsed.exp < Date.now() || parsed.email !== process.env.CONTROL_OWNER_EMAIL) return null
  return parsed
}

function verifyOwnerPassword(password) {
  const stored = process.env.CONTROL_OWNER_PASSWORD_HASH || ''
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== 'scrypt' || typeof password !== 'string') return false
  const [_, salt, expected, keyLength] = parts
  const derived = crypto.scryptSync(password, Buffer.from(salt, 'base64url'), Number(keyLength), { N: 16384, r: 8, p: 1 })
  const expectedBuffer = Buffer.from(expected, 'base64url')
  return derived.length === expectedBuffer.length && crypto.timingSafeEqual(derived, expectedBuffer)
}

function requireOwner(request, response) {
  const session = sessionFrom(request)
  if (session) return session
  response.status(401).json({ error: 'owner_authentication_required' })
  return null
}

function setOwnerSession(response, email, subject) {
  appendCookie(response, cookie(SESSION, signedSession(email, subject), { maxAge: 60 * 60 * 12 }))
}
function clearOwnerSession(response) {
  appendCookie(response, cookie(SESSION, '', { maxAge: 0 }))
}
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

module.exports = { sessionConfigured, vercelConfigured, passwordConfigured, verifyOwnerPassword, sessionFrom, requireOwner, setOwnerSession, clearOwnerSession, safeEqual }
