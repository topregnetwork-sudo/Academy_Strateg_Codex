const { requireOwner } = require('../../lib/owner-auth')
const { jsonBody } = require('../../lib/http')
const { listTasks, createTask } = require('../../lib/project-control')
const { publishLatestPendingEvent } = require('../../lib/project-control-queue')

export default async function handler(request, response) {
  if (!requireOwner(request, response)) return
  try {
    if (request.method === 'GET') return response.status(200).json({ tasks: await listTasks() })
    if (request.method === 'POST') {
      const body = jsonBody(request)
      if (!body) return response.status(400).json({ error: 'invalid_json' })
      const result = await createTask(body)
      try { await publishLatestPendingEvent(result.task.id) } catch (_) { /* durable event stays visible as FAILED; no request or task is lost */ }
      return response.status(201).json(await require('../../lib/project-control').taskDetail(result.task.id))
    }
    response.setHeader('Allow', 'GET, POST')
    return response.status(405).json({ error: 'method_not_allowed' })
  } catch (error) {
    return response.status(error.code === 'invalid_input' ? 400 : 503).json({ error: error.code || 'task_service_unavailable' })
  }
}
