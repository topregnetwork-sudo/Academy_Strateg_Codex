const { clearOwnerSession } = require('../../lib/owner-auth')

export default function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'method_not_allowed' })
  clearOwnerSession(response)
  return response.status(204).end()
}
