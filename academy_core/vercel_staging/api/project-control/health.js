const { neon } = require('@neondatabase/serverless')

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'method_not_allowed' })
  }

  if (!process.env.DATABASE_URL) {
    return response.status(503).json({
      ok: false,
      service: 'project-control-metadata',
      database: 'not_configured'
    })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)
    const rows = await sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name like 'control_%'
      order by table_name
    `
    const expected = [
      'control_agent_requests',
      'control_approvals',
      'control_audit_events',
      'control_projects',
      'control_proposals',
      'control_task_revisions',
      'control_tasks'
    ]
    const found = rows.map((row) => row.table_name)
    const missing = expected.filter((name) => !found.includes(name))
    const counts = missing.length ? [] : await sql`
      select
        (select count(*)::int from control_projects where archived_at is null) as active_projects,
        (select count(*)::int from control_tasks where archived_at is null) as active_tasks,
        (select count(*)::int from control_tasks where archived_at is not null and title = 'Synthetic metadata-only lifecycle verification') as archived_synthetic_tasks
    `

    return response.status(missing.length ? 503 : 200).json({
      ok: missing.length === 0,
      service: 'project-control-metadata',
      environment: 'isolated-staging',
      schema: missing.length ? 'incomplete' : 'ready',
      tables: found,
      missing,
      data_scope: 'metadata_only',
      registry: missing.length ? null : counts[0]
    })
  } catch (_error) {
    return response.status(503).json({
      ok: false,
      service: 'project-control-metadata',
      database: 'unavailable'
    })
  }
}
