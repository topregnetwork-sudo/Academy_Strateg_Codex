const ACCEPTED_EVENTS = new Set([
  'business_test.registered',
  'business_test.completed'
])

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'method_not_allowed' })
  }

  if (!process.env.DATABASE_URL || !process.env.BUSINESS_TEST_WEBHOOK_SECRET) {
    return response.status(503).json({
      error: 'staging_not_connected',
      detail: 'Database and signed platform-webhook configuration are required before this endpoint accepts events.'
    })
  }

  const eventType = request.body?.event_type
  if (!ACCEPTED_EVENTS.has(eventType)) {
    return response.status(400).json({ error: 'unsupported_event_type' })
  }

  // Deliberately closed until the platform signature contract and DB adapter are
  // connected. It must never silently treat a public request as a valid result.
  return response.status(501).json({
    error: 'adapter_not_released',
    detail: 'The signed business-test adapter requires a bounded E2E release.'
  })
}
