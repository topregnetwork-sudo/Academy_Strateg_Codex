export default function handler(_request, response) {
  response.status(200).json({
    ok: true,
    service: 'academy-core',
    environment: 'staging',
    database: process.env.DATABASE_URL ? 'configured' : 'not_configured',
    legacy_runtime: 'disabled'
  })
}
