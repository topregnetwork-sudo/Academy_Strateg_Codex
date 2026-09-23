function readCookies(request) {
  const header = request.headers.cookie || ''
  return Object.fromEntries(header.split(';').map((part) => {
    const index = part.indexOf('=')
    if (index < 0) return ['', '']
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())]
  }).filter(([key]) => key))
}

function cookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax']
  if (options.secure !== false) parts.push('Secure')
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`)
  return parts.join('; ')
}

function appendCookie(response, value) {
  const previous = response.getHeader('Set-Cookie')
  response.setHeader('Set-Cookie', previous ? [...(Array.isArray(previous) ? previous : [previous]), value] : [value])
}

function jsonBody(request) {
  if (!request.body) return {}
  if (typeof request.body === 'object') return request.body
  try { return JSON.parse(request.body) } catch (_) { return null }
}

function publicOrigin(request) {
  const configured = process.env.CONTROL_APP_ORIGIN
  if (configured) return configured.replace(/\/$/, '')
  const forwarded = request.headers['x-forwarded-proto'] || 'https'
  return `${forwarded}://${request.headers.host}`
}

module.exports = { readCookies, cookie, appendCookie, jsonBody, publicOrigin }
