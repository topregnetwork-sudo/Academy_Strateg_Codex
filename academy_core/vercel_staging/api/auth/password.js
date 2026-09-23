const { passwordConfigured, verifyOwnerPassword, setOwnerSession } = require('../../lib/owner-auth')
const { jsonBody } = require('../../lib/http')

export default function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'method_not_allowed' })
  if (!passwordConfigured()) return response.status(503).json({ error: 'owner_password_not_configured' })
  const body = jsonBody(request)
  if (!body || !verifyOwnerPassword(body.password)) return response.status(401).json({ error: 'invalid_access_code' })
  setOwnerSession(response, process.env.CONTROL_OWNER_EMAIL, 'owner-password')
  return response.status(200).json({ ok: true })
}
