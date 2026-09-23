const { requireOwner } = require('../../lib/owner-auth')
const { jsonBody } = require('../../lib/http')
const { taskDetail, reviseTask, applyOwnerDecision, updateState, moveTask, queueAnalysis } = require('../../lib/project-control')
const { publishLatestPendingEvent } = require('../../lib/project-control-queue')

export default async function handler(request, response) {
  if (!requireOwner(request, response)) return
  const taskId = typeof request.query.id === 'string' ? request.query.id : ''
  if (!taskId) return response.status(400).json({ error: 'task_id_required' })
  try {
    if (request.method === 'GET') {
      const result = await taskDetail(taskId)
      return result ? response.status(200).json(result) : response.status(404).json({ error: 'task_not_found' })
    }
    if (request.method !== 'POST') return response.status(405).json({ error: 'method_not_allowed' })
    const body = jsonBody(request)
    if (!body) return response.status(400).json({ error: 'invalid_json' })
    let result
    if (body.action === 'revise') result = await reviseTask(taskId, body)
    else if (body.action === 'decision') result = await applyOwnerDecision(taskId, body)
    else if (body.action === 'update_state') result = await updateState(taskId, body)
    else if (body.action === 'move') result = await moveTask(taskId, body)
    else if (body.action === 'queue_analysis') result = await queueAnalysis(taskId)
    else return response.status(400).json({ error: 'unsupported_action' })
    if (body.action === 'revise' || body.action === 'queue_analysis') {
      try { await publishLatestPendingEvent(taskId) } catch (_) { /* owner event persists with a visible FAILED delivery state */ }
      result = await taskDetail(taskId)
    }
    return response.status(200).json(result)
  } catch (error) {
    return response.status(error.code === 'invalid_input' ? 400 : 503).json({ error: error.code || 'task_service_unavailable' })
  }
}
