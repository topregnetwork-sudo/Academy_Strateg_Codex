const crypto = require('node:crypto')
const { vercelConfigured } = require('../../lib/owner-auth')
const { cookie, appendCookie, publicOrigin } = require('../../lib/http')

export default function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'method_not_allowed' })
  if (!vercelConfigured()) return response.status(503).json({ error: 'vercel_identity_not_configured' })
  const state = crypto.randomBytes(32).toString('base64url')
  const nonce = crypto.randomBytes(32).toString('base64url')
  const verifier = crypto.randomBytes(48).toString('base64url')
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
  appendCookie(response, cookie('control_oauth_state', state, { maxAge: 600 }))
  appendCookie(response, cookie('control_oauth_nonce', nonce, { maxAge: 600 }))
  appendCookie(response, cookie('control_oauth_verifier', verifier, { maxAge: 600 }))
  const query = new URLSearchParams({
    client_id: process.env.VERCEL_APP_CLIENT_ID,
    redirect_uri: `${publicOrigin(request)}/api/auth/callback`,
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    response_type: 'code',
    scope: 'openid email profile'
  })
  return response.redirect(302, `https://vercel.com/oauth/authorize?${query.toString()}`)
}
