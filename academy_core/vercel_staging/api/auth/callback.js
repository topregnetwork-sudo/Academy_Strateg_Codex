const { vercelConfigured, safeEqual, setOwnerSession } = require('../../lib/owner-auth')
const { readCookies, cookie, appendCookie, publicOrigin } = require('../../lib/http')

function clearOAuth(response) {
  for (const name of ['control_oauth_state', 'control_oauth_nonce', 'control_oauth_verifier']) appendCookie(response, cookie(name, '', { maxAge: 0 }))
}

function failed(response, code) {
  clearOAuth(response)
  return response.redirect(302, `/?auth_error=${encodeURIComponent(code)}`)
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'method_not_allowed' })
  if (!vercelConfigured()) return failed(response, 'identity_not_configured')
  const url = new URL(request.url, publicOrigin(request))
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const cookies = readCookies(request)
  if (!code || !safeEqual(state, cookies.control_oauth_state) || !cookies.control_oauth_verifier) return failed(response, 'authorization_validation_failed')
  try {
    const redirectUri = `${publicOrigin(request)}/api/auth/callback`
    const tokenResponse = await fetch('https://api.vercel.com/login/oauth/token', {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.VERCEL_APP_CLIENT_ID,
        client_secret: process.env.VERCEL_APP_CLIENT_SECRET,
        code,
        code_verifier: cookies.control_oauth_verifier,
        redirect_uri: redirectUri
      })
    })
    if (!tokenResponse.ok) return failed(response, 'token_exchange_failed')
    const token = await tokenResponse.json()
    const userResponse = await fetch('https://api.vercel.com/login/oauth/userinfo', {
      method: 'POST', headers: { Authorization: `Bearer ${token.access_token}` }
    })
    if (!userResponse.ok) return failed(response, 'identity_lookup_failed')
    const user = await userResponse.json()
    if (!user.email_verified || user.email !== process.env.CONTROL_OWNER_EMAIL || !user.sub) return failed(response, 'account_not_authorized')
    setOwnerSession(response, user.email, user.sub)
    clearOAuth(response)
    return response.redirect(302, '/')
  } catch (_) {
    return failed(response, 'identity_service_unavailable')
  }
}
