const { randomUUID } = require('node:crypto')
const { neon } = require('@neondatabase/serverless')

const states = new Set(['DRAFT', 'QUEUED_FOR_ANALYSIS', 'ANALYSING', 'PROPOSAL_READY', 'NEEDS_OWNER_INPUT', 'APPROVED_FOR_EXECUTION', 'EXECUTING', 'RESULT_READY_FOR_OWNER_REVIEW', 'OWNER_ACCEPTED', 'BLOCKED', 'ROLLED_BACK', 'ARCHIVED'])
const priorities = new Set(['P0', 'P1', 'P2', 'P3'])

function sql() {
  if (!process.env.DATABASE_URL) throw new Error('database_not_configured')
  return neon(process.env.DATABASE_URL)
}
function value(input, max) {
  return typeof input === 'string' ? input.trim().slice(0, max) : ''
}
function inputError(message) {
  const error = new Error(message)
  error.code = 'invalid_input'
  return error
}
function revisionBody({ title, nextStep, ownerComment }) {
  return [title && `Задача: ${title}`, ownerComment && `Комментарий владельца:\n${ownerComment}`, nextStep && `Следующий шаг:\n${nextStep}`].filter(Boolean).join('\n\n')
}

async function listTasks() {
  const client = sql()
  return client.query(`
    select t.id, t.title, t.priority, t.state, t.next_step, t.created_at, t.updated_at,
           p.id as project_id, p.name as project_name, p.kind as project_kind,
           coalesce((select max(r.ordinal) from control_task_revisions r where r.task_id = t.id), 0) as revision_count,
           coalesce((select count(*) from control_proposals q where q.task_id = t.id and q.state in ('PROPOSED','REVISED')), 0) as open_proposal_count
    from control_tasks t join control_projects p on p.id = t.project_id
    where t.archived_at is null and p.archived_at is null
    order by case t.priority when 'P0' then 0 when 'P1' then 1 when 'P2' then 2 else 3 end, t.updated_at desc
  `)
}

async function taskDetail(taskId) {
  const client = sql()
  const [tasks, revisions, proposals, approvals, outboxEvents, executionRequests] = await Promise.all([
    client.query(`select t.*, p.name as project_name, p.kind as project_kind from control_tasks t join control_projects p on p.id=t.project_id where t.id=$1`, [taskId]),
    client.query(`select id, ordinal, event_type, author_role, body, source_reference, created_at from control_task_revisions where task_id=$1 order by ordinal asc`, [taskId]),
    client.query(`select id, revision_id, state, scope, facts, risks, verification_plan, rollback_plan, created_at, superseded_at from control_proposals where task_id=$1 order by created_at desc`, [taskId]),
    client.query(`select id, proposal_id, approval_type, actor_role, note, created_at from control_approvals where task_id=$1 order by created_at desc`, [taskId]),
    client.query(`select id, revision_id, operation, idempotency_key, correlation_id, scope, classification, delivery_state, queue_message_id, delivery_attempts, last_failure, published_at, delivered_at, created_at from control_outbox_events where task_id=$1 order by created_at desc`, [taskId]),
    client.query(`select id,proposal_id,scope,allowed_operation,risks,verification_links,rollback_plan,state,created_at,confirmed_at,completed_at from control_execution_requests where task_id=$1 order by created_at desc`, [taskId])
  ])
  return tasks[0] ? { task: tasks[0], revisions, proposals, approvals, outbox_events: outboxEvents, execution_requests: executionRequests } : null
}

async function createTask(input) {
  const title = value(input.title, 240)
  const projectName = value(input.project_name, 160)
  const projectKind = input.project_kind === 'funnel' ? 'funnel' : 'platform'
  const priority = priorities.has(input.priority) ? input.priority : 'P2'
  const comment = value(input.owner_comment, 40000)
  const nextStep = value(input.next_step, 12000)
  if (!title || !projectName) throw inputError('project_name_and_title_required')
  const client = sql()
  const taskId = randomUUID()
  const projectId = randomUUID()
  const revisionId = randomUUID()
  await client.query('select control_create_task_and_enqueue($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', [projectName, projectKind, title, priority, nextStep, revisionBody({ title, nextStep, ownerComment: comment }) || 'Задача создана владельцем.', taskId, projectId, revisionId, randomUUID(), randomUUID(), randomUUID()])
  return taskDetail(taskId)
}

async function reviseTask(taskId, input) {
  const body = value(input.body, 40000)
  const nextStep = value(input.next_step, 12000)
  if (!body) throw inputError('revision_body_required')
  const client = sql()
  const current = await client.query('select id from control_tasks where id=$1 and archived_at is null', [taskId])
  if (!current[0]) throw inputError('task_not_found')
  const revisionId = randomUUID()
  await client.query('select control_revise_task_and_enqueue($1,$2,$3,$4,$5,$6,$7)', [taskId, body, nextStep, revisionId, randomUUID(), randomUUID(), randomUUID()])
  await client.query(`update control_proposals set state='SUPERSEDED',superseded_at=now() where task_id=$1 and state in ('PROPOSED','REVISED')`, [taskId])
  return taskDetail(taskId)
}

async function applyOwnerDecision(taskId, input) {
  const decision = value(input.decision, 40)
  const note = value(input.note, 12000)
  const proposalId = value(input.proposal_id, 100)
  const map = {
    approve: { approval: 'APPROVE_EXECUTION', state: 'APPROVED_FOR_EXECUTION', event: 'OWNER_APPROVED' },
    rework: { approval: 'REQUEST_REWORK', state: 'NEEDS_OWNER_INPUT', event: 'REQUEST_REWORK' },
    accept_result: { approval: 'ACCEPT_RESULT', state: 'OWNER_ACCEPTED', event: 'OWNER_ACCEPTED' },
    rollback: { approval: 'REQUEST_ROLLBACK', state: 'BLOCKED', event: 'ROLLED_BACK' }
  }[decision]
  if (!map || !proposalId) throw inputError('decision_and_proposal_required')
  const client = sql()
  const proposals = await client.query(`select id,scope,risks,verification_plan,rollback_plan from control_proposals where id=$1 and task_id=$2 and state in ('PROPOSED','REVISED') and superseded_at is null`, [proposalId, taskId])
  if (!proposals[0]) throw inputError('proposal_not_found')
  if (decision === 'approve') {
    const proposal = proposals[0]
    await client.query(`insert into control_execution_requests(id,task_id,proposal_id,scope,allowed_operation,risks,verification_links,rollback_plan,state) values($1,$2,$3,$4,'LIVE_ACTION_REQUIRES_ACTION_TIME_CONFIRMATION',$5,$6,$7,'PENDING_ACTION_TIME_CONFIRMATION')`, [randomUUID(),taskId,proposalId,proposal.scope,proposal.risks,proposal.verification_plan,proposal.rollback_plan])
  }
  if (decision === 'rollback') await client.query(`update control_execution_requests set state='CANCELLED' where task_id=$1 and state='PENDING_ACTION_TIME_CONFIRMATION'`, [taskId])
  const ordinal = Number((await client.query('select coalesce(max(ordinal), 0) as value from control_task_revisions where task_id=$1', [taskId]))[0].value) + 1
  await client.query('insert into control_approvals (id,task_id,proposal_id,approval_type,actor_role,note) values ($1,$2,$3,$4,$5,$6)', [randomUUID(), taskId, proposalId, map.approval, 'owner', note])
  await client.query('insert into control_task_revisions (id,task_id,ordinal,event_type,author_role,body,source_reference) values ($1,$2,$3,$4,$5,$6,$7)', [randomUUID(), taskId, ordinal, map.event, 'owner', note || map.event, 'Project Control owner decision'])
  await client.query('update control_tasks set state=$1, updated_at=now() where id=$2', [map.state, taskId])
  await client.query('insert into control_audit_events (id,task_id,event_type,actor_role,summary) values ($1,$2,$3,$4,$5)', [randomUUID(), taskId, map.event, 'owner', `Owner decision: ${map.approval}.`])
  return taskDetail(taskId)
}

async function updateState(taskId, input) {
  const state = value(input.state, 60)
  if (!states.has(state)) throw inputError('invalid_state')
  const nextStep = value(input.next_step, 12000)
  const client = sql()
  const changed = await client.query('update control_tasks set state=$1,next_step=$2,updated_at=now() where id=$3 and archived_at is null returning id', [state, nextStep, taskId])
  if (!changed[0]) throw inputError('task_not_found')
  return taskDetail(taskId)
}

async function moveTask(taskId, input) {
  const projectName = value(input.project_name, 160)
  const projectKind = input.project_kind === 'funnel' ? 'funnel' : 'platform'
  if (!projectName) throw inputError('project_name_required')
  const client = sql()
  const current = await client.query('select id, project_id from control_tasks where id=$1 and archived_at is null', [taskId])
  if (!current[0]) throw inputError('task_not_found')
  const existing = await client.query('select id from control_projects where lower(name)=lower($1) and kind=$2 and archived_at is null limit 1', [projectName, projectKind])
  const projectId = existing[0]?.id || randomUUID()
  if (!existing[0]) await client.query('insert into control_projects (id,name,kind) values ($1,$2,$3)', [projectId, projectName, projectKind])
  const ordinal = Number((await client.query('select coalesce(max(ordinal),0) as value from control_task_revisions where task_id=$1', [taskId]))[0].value) + 1
  await client.query('update control_tasks set project_id=$1, updated_at=now() where id=$2', [projectId, taskId])
  await client.query('insert into control_task_revisions (id,task_id,ordinal,event_type,author_role,body,source_reference) values ($1,$2,$3,$4,$5,$6,$7)', [randomUUID(), taskId, ordinal, 'OWNER_CLARIFIED', 'owner', `Карточка перенесена владельцем в: ${projectName} (${projectKind === 'platform' ? 'платформа' : 'воронка'}).`, 'Project Control owner reclassification'])
  await client.query('insert into control_audit_events (id,task_id,event_type,actor_role,summary) values ($1,$2,$3,$4,$5)', [randomUUID(), taskId, 'TASK_RECLASSIFIED', 'owner', `Task moved to ${projectName} (${projectKind}).`])
  return taskDetail(taskId)
}

async function queueAnalysis(taskId) {
  const client = sql()
  const current = await client.query('select id from control_tasks where id=$1 and archived_at is null', [taskId])
  if (!current[0]) throw inputError('task_not_found')
  const revisionId = randomUUID()
  await client.query('select control_queue_task_analysis($1,$2,$3,$4,$5)', [taskId, revisionId, randomUUID(), randomUUID(), randomUUID()])
  return taskDetail(taskId)
}

module.exports = { listTasks, taskDetail, createTask, reviseTask, applyOwnerDecision, updateState, moveTask, queueAnalysis }
