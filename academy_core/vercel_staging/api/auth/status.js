const { sessionConfigured, vercelConfigured, passwordConfigured, sessionFrom } = require('../../lib/owner-auth')

export default function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'method_not_allowed' })
  const session = sessionFrom(request)
  return response.status(200).json({
    configured: sessionConfigured() && (vercelConfigured() || passwordConfigured()),
    vercel_configured: vercelConfigured(),
    password_configured: passwordConfigured(),
    signed_in: Boolean(session),
    owner: session ? { email: session.email } : null,
    scope: 'isolated_staging_metadata_only'
  })
}
