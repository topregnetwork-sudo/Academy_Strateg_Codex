const { readFileSync } = require('node:fs')
const { randomUUID, timingSafeEqual } = require('node:crypto')
const { neon } = require('@neondatabase/serverless')
const { publishLatestPendingEvent } = require('../../lib/project-control-queue')

function authorized(request) {
  const expected = process.env.CONTROL_SYNTHETIC_RUN_TOKEN
  const supplied = request.headers['x-control-synthetic-token']
  if (!expected || typeof supplied !== 'string') return false
  const left = Buffer.from(expected); const right = Buffer.from(supplied)
  return left.length === right.length && timingSafeEqual(left, right)
}
function clean(error) { return String(error?.message || 'unknown_error').replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[redacted-connection-string]').slice(0, 280) }

function migrationStatements(source) {
  // The Neon HTTP driver accepts one prepared statement per request.  The
  // migration is intentionally kept as a single audited file, then split only
  // at its top-level SQL declarations; semicolons inside PL/pgSQL bodies stay
  // in the same statement.
  return source
    .replace(/^--.*$/gm, '')
    .split(/\n(?=(?:begin;|commit;|create table|create index|create or replace function|insert into schema_migrations))/i)
    .map((statement) => statement.trim())
    .filter((statement) => statement && !/^(begin|commit);$/i.test(statement))
}

export default async function handler(request, response) {
  if (!['GET', 'POST'].includes(request.method)) { response.setHeader('Allow', 'GET, POST'); return response.status(405).json({ error: 'method_not_allowed' }) }
  if (!process.env.DATABASE_URL) return response.status(503).json({ error: 'database_not_configured' })
  if (!authorized(request)) return response.status(401).json({ error: 'synthetic_authorization_required' })
  const mode = typeof request.query.mode === 'string' ? request.query.mode : 'lifecycle'
  const sql = neon(process.env.DATABASE_URL)
  try {
    if (mode === 'migrate-outbox' || mode === 'migrate-cloud-analyse' || mode === 'migrate-execution') {
      const migrationId = mode === 'migrate-execution' ? '0005_project_control_execution_requests' : mode === 'migrate-cloud-analyse' ? '0004_project_control_cloud_analyse' : '0003_project_control_event_outbox'
      const fileName = mode === 'migrate-execution' ? '0005_project_control_execution_requests.sql' : mode === 'migrate-cloud-analyse' ? '0004_project_control_cloud_analyse.sql' : '0003_project_control_event_outbox.sql'
      const found = await sql.query('select migration_id from schema_migrations where migration_id=$1', [migrationId])
      if (!found[0]) {
        const source = readFileSync(require.resolve(`../../migrations/${fileName}`), 'utf8')
        for (const statement of migrationStatements(source)) await sql.query(statement)
      }
      const tableName = mode === 'migrate-execution' ? 'control_execution_requests' : mode === 'migrate-cloud-analyse' ? 'control_analysis_runs' : 'control_outbox_events'
      const readback = await sql.query(`select exists(select 1 from information_schema.tables where table_schema='public' and table_name='${tableName}') as table_ready, exists(select 1 from schema_migrations where migration_id=$1) as registered`, [migrationId])
      return response.status(200).json({ ok: true, migration: migrationId, readback: readback[0] })
    }
    if (mode === 'outbox' && request.method === 'GET') {
      const taskId = typeof request.query.task_id === 'string' ? request.query.task_id : ''
      if (!taskId) return response.status(400).json({ error: 'task_id_required' })
      return response.status(200).json({ ok: true, task_id: taskId, events: await sql.query('select id,idempotency_key,correlation_id,delivery_state,delivery_attempts,queue_message_id,last_failure from control_outbox_events where task_id=$1', [taskId]), analysis: await sql.query(`select r.state,r.provider_request_id,r.input_tokens,r.output_tokens,r.actual_microusd,p.id as proposal_id from control_analysis_runs r left join control_proposals p on p.task_id=r.task_id where r.task_id=$1 order by r.created_at desc`, [taskId]) })
    }
    if (mode === 'outbox') {
      const runId = randomUUID(), projectId = randomUUID(), taskId = randomUUID(), revisionId = randomUUID(), eventId = randomUUID(), correlationId = randomUUID()
      await sql.query('select control_create_task_and_enqueue($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', [`Synthetic Event Transport ${runId}`, 'platform', 'Synthetic event delivery verification', 'P1', 'Check one queue event; no model and no external action.', 'Synthetic metadata-only transport verification.', taskId, projectId, revisionId, eventId, correlationId, randomUUID()])
      const first_publish = await publishLatestPendingEvent(taskId)
      const second_publish = await publishLatestPendingEvent(taskId)
      const events = await sql.query('select id,idempotency_key,correlation_id,delivery_state,delivery_attempts,queue_message_id,last_failure from control_outbox_events where task_id=$1', [taskId])
      return response.status(201).json({ ok: true, environment: 'isolated-staging', data_scope: 'metadata_only', model_called: false, external_actions: false, evidence: { task_id: taskId, revision_id: revisionId, event_id: eventId, correlation_id: correlationId, first_publish, second_publish, events } })
    }
    if (mode === 'prompt5') {
      const runId=randomUUID(), projectId=randomUUID(), taskId=randomUUID(), firstRevision=randomUUID(), secondRevision=randomUUID(), oldProposal=randomUUID(), activeProposal=randomUUID(), requestId=randomUUID(), acceptanceId=randomUUID()
      await sql.query('insert into control_projects(id,name,kind) values($1,$2,$3)',[projectId,`Synthetic Prompt 5 ${runId}`,'platform'])
      await sql.query(`insert into control_tasks(id,project_id,title,priority,state,next_step) values($1,$2,'Synthetic approval lifecycle','P1','PROPOSAL_READY','Owner may review the synthetic result only.')`,[taskId,projectId])
      await sql.query(`insert into control_task_revisions(id,task_id,ordinal,event_type,author_role,body,source_reference) values($1,$2,1,'IDEA_CREATED','owner','Synthetic initial revision.','PROMPT5-E2E'),($3,$2,2,'OWNER_CLARIFIED','owner','Synthetic clarification; old proposal must remain in history.','PROMPT5-E2E')`,[firstRevision,taskId,secondRevision])
      await sql.query(`insert into control_proposals(id,task_id,revision_id,state,scope,facts,risks,verification_plan,rollback_plan,superseded_at) values($1,$2,$3,'SUPERSEDED','Old synthetic scope','Old facts','No live risk','History check','No rollback',now()),($4,$2,$5,'PROPOSED','Synthetic staging-only scope','The revision and request are persisted.','No external action.','Read back all IDs and states.','Archive synthetic task.',null)`,[oldProposal,taskId,firstRevision,activeProposal,secondRevision])
      await sql.query(`insert into control_execution_requests(id,task_id,proposal_id,scope,allowed_operation,risks,verification_links,rollback_plan,state) values($1,$2,$3,'Synthetic staging-only scope','LIVE_ACTION_REQUIRES_ACTION_TIME_CONFIRMATION','No live risk','Readback IDs','Archive synthetic task','PENDING_ACTION_TIME_CONFIRMATION')`,[requestId,taskId,activeProposal])
      await sql.query(`insert into control_approvals(id,task_id,proposal_id,approval_type,actor_role,note) values($1,$2,$3,'APPROVE_EXECUTION','owner','Synthetic approval only; no execution started.'),($4,$2,$3,'ACCEPT_RESULT','owner','Synthetic result accepted.')`,[randomUUID(),taskId,activeProposal,acceptanceId])
      await sql.query(`update control_execution_requests set state='RESULT_READY_FOR_OWNER_REVIEW',completed_at=now() where id=$1`,[requestId])
      await sql.query(`update control_tasks set state='RESULT_READY_FOR_OWNER_REVIEW' where id=$1`,[taskId])
      await sql.query(`update control_execution_requests set state='OWNER_ACCEPTED' where id=$1`,[requestId])
      await sql.query(`update control_tasks set state='OWNER_ACCEPTED' where id=$1`,[taskId])
      const readback=await sql.query(`select t.state as task_state,(select count(*) from control_proposals where task_id=t.id and state='SUPERSEDED') as superseded_count,(select state from control_execution_requests where id=$2) as execution_state,(select count(*) from control_approvals where task_id=t.id) as approvals from control_tasks t where t.id=$1`,[taskId,requestId])
      return response.status(201).json({ok:true,environment:'isolated-staging',external_actions:false,evidence:{task_id:taskId,old_proposal_id:oldProposal,active_proposal_id:activeProposal,execution_request_id:requestId,readback:readback[0]}})
    }
    if (request.method !== 'POST') return response.status(405).json({ error: 'method_not_allowed' })
    const runId = randomUUID(), projectId = randomUUID(), taskId = randomUUID(), revisionId = randomUUID(), proposalId = randomUUID(), requestId = randomUUID(), correlationId = randomUUID()
    await sql.query('insert into control_projects (id,name,kind) values ($1,$2,$3)', [projectId, `Synthetic Project Control ${runId}`, 'platform'])
    await sql.query('insert into control_tasks (id,project_id,title,priority,state,next_step) values ($1,$2,$3,$4,$5,$6)', [taskId, projectId, 'Synthetic metadata-only lifecycle verification', 'P1', 'RESULT_READY_FOR_OWNER_REVIEW', 'Owner may inspect this synthetic result; it cannot affect a live system.'])
    await sql.query('insert into control_task_revisions (id,task_id,ordinal,event_type,author_role,body,source_reference) values ($1,$2,$3,$4,$5,$6,$7)', [revisionId, taskId, 1, 'RESULT_READY_FOR_OWNER_REVIEW', 'system', 'Synthetic staging verification only. No personal data and no live-funnel action.', 'PROJECT-CONTROL-SYNTHETIC-E2E'])
    await sql.query('insert into control_proposals (id,task_id,revision_id,state,scope,facts,risks,verification_plan,rollback_plan) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [proposalId, taskId, revisionId, 'PROPOSED', 'Verify metadata task lifecycle in isolated staging only.', 'A project, task, revision, proposal, agent request and audit event were written.', 'This test contains no applicant or production data and creates no external action.', 'Check API response IDs.', 'Archive synthetic project/task later.'])
    await sql.query('insert into control_agent_requests (id,task_id,revision_id,operation,idempotency_key,state,correlation_id,completed_at) values ($1,$2,$3,$4,$5,$6,$7,now())', [requestId, taskId, revisionId, 'VERIFY', `synthetic-${runId}`, 'SUCCEEDED', correlationId])
    return response.status(201).json({ ok: true, environment: 'isolated-staging', data_scope: 'metadata_only', state: 'RESULT_READY_FOR_OWNER_REVIEW', evidence: { task_id: taskId, revision_id: revisionId, proposal_id: proposalId, request_id: requestId, correlation_id: correlationId } })
  } catch (error) { return response.status(503).json({ ok: false, error: 'synthetic_run_failed', diagnostic: clean(error) }) }
}
