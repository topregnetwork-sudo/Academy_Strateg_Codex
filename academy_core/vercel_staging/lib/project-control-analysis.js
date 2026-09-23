const { neon } = require('@neondatabase/serverless')
const { randomUUID } = require('node:crypto')

const MAX_MONTH_MICROUSD = 2000000
const RESERVE_MICROUSD = 10000
const MODEL = 'gpt-5.6-luna'
function db() { if (!process.env.DATABASE_URL) throw new Error('database_not_configured'); return neon(process.env.DATABASE_URL) }
function sensitive(text) { return /(?:\b[\w.+-]+@[\w-]+\.[\w.-]+\b|(?:\+?\d[\s()-]?){10,}|sk-[A-Za-z0-9_-]{16,})/.test(text) }
function cleanText(value, max) { return String(value || '').trim().slice(0, max) }
function estimate(usage) { return Math.ceil(((Number(usage?.input_tokens)||0) * .20 + (Number(usage?.output_tokens)||0) * 1.20)) }

async function analyse(message, metadata) {
  if (!process.env.OPENAI_API_KEY) throw new Error('openai_key_not_configured')
  if (!message?.event_id || !message?.correlation_id || message.classification !== 'METADATA_ONLY' || message.operation !== 'ANALYSE') throw new Error('invalid_project_control_queue_message')
  const sql = db(), eventId = message.event_id
  const event = (await sql.query(`select e.*,t.title,t.priority,t.next_step,r.body from control_outbox_events e join control_tasks t on t.id=e.task_id join control_task_revisions r on r.id=e.revision_id where e.id=$1 and e.correlation_id=$2`, [eventId, message.correlation_id]))[0]
  if (!event) return { duplicate: true }
  const prior = (await sql.query('select state from control_analysis_runs where event_id=$1', [eventId]))[0]
  if (prior?.state === 'SUCCEEDED') return { duplicate: true, state: prior.state }
  if (prior) await sql.query(`delete from control_analysis_runs where event_id=$1 and state='CLAIMED'`, [eventId])
  const month = (await sql.query(`select coalesce(sum(reserved_microusd),0) as reserved,coalesce(sum(event_count),0) as count from control_analysis_monthly_budget where month_start=date_trunc('month',now())::date`))[0]
  if (Number(month.reserved) + RESERVE_MICROUSD > MAX_MONTH_MICROUSD || Number(month.count) >= 200) return mark(event, 'BUDGET_EXCEEDED', 'monthly_budget_guard')
  const runId = randomUUID()
  await sql.query(`insert into control_analysis_runs(id,event_id,task_id,correlation_id,state) values($1,$2,$3,$4,'CLAIMED')`, [runId,event.id,event.task_id,event.correlation_id])
  await sql.query(`insert into control_analysis_monthly_budget(month_start,event_count,reserved_microusd) values(date_trunc('month',now())::date,1,$1) on conflict(month_start) do update set event_count=control_analysis_monthly_budget.event_count+1,reserved_microusd=control_analysis_monthly_budget.reserved_microusd+$1,updated_at=now()`, [RESERVE_MICROUSD])
  const input = { title: cleanText(event.title,240), priority: event.priority, next_step: cleanText(event.next_step,1200), context: cleanText(event.body,12000) }
  if (sensitive(JSON.stringify(input))) return mark(event, 'INPUT_BLOCKED', 'sensitive_input_detected', runId)
  const system = 'You prepare a metadata-only internal proposal. No tools, no external actions. Return only JSON with strings: scope,facts,risks,verification,rollback,next_step. Never include personal data, credentials, payments, or claims of execution.'
  const schema = { type:'object', additionalProperties:false, required:['scope','facts','risks','verification','rollback','next_step'], properties:{ scope:{type:'string'}, facts:{type:'string'}, risks:{type:'string'}, verification:{type:'string'}, rollback:{type:'string'}, next_step:{type:'string'} } }
  const api = await fetch('https://api.openai.com/v1/responses', { method:'POST', headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':event.idempotency_key}, body:JSON.stringify({model:MODEL,input:[{role:'system',content:system},{role:'user',content:JSON.stringify(input)}],text:{format:{type:'json_schema',name:'project_control_proposal',strict:true,schema}},max_output_tokens:1500}) })
  if (!api.ok) throw new Error(`openai_${api.status}`)
  const result = await api.json(); let proposal
  try {
    const text = String(result.output_text || result.output?.flatMap(item => item.content || []).map(part => part.text || '').join('') || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    proposal = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
  } catch { throw new Error('invalid_model_json') }
  for (const k of ['scope','facts','risks','verification','rollback','next_step']) if (!cleanText(proposal[k],1)) throw new Error('incomplete_model_proposal')
  const revisionId=randomUUID(), proposalId=randomUUID(), cost=estimate(result.usage)
  const ordinal=Number((await sql.query('select coalesce(max(ordinal),0) as n from control_task_revisions where task_id=$1',[event.task_id]))[0].n)+1
  await sql.query(`insert into control_task_revisions(id,task_id,ordinal,event_type,author_role,body,source_reference) values($1,$2,$3,'DECISION_PROPOSED','system',$4,'Cloud ANALYSE: metadata-only')`,[revisionId,event.task_id,ordinal,'Cloud analysis proposal stored; no external action was performed.'])
  await sql.query(`insert into control_proposals(id,task_id,revision_id,state,scope,facts,risks,verification_plan,rollback_plan) values($1,$2,$3,'PROPOSED',$4,$5,$6,$7,$8)`,[proposalId,event.task_id,revisionId,cleanText(proposal.scope,12000),cleanText(proposal.facts,12000),cleanText(proposal.risks,12000),cleanText(proposal.verification,12000),cleanText(proposal.rollback,12000)])
  await sql.query(`update control_tasks set state='PROPOSAL_READY',next_step=$1,updated_at=now() where id=$2`,[cleanText(proposal.next_step,12000),event.task_id])
  await sql.query(`update control_analysis_runs set state='SUCCEEDED',provider_request_id=$1,input_tokens=$2,output_tokens=$3,actual_microusd=$4,completed_at=now() where id=$5`,[result.id||null,result.usage?.input_tokens||0,result.usage?.output_tokens||0,cost,runId])
  await sql.query(`update control_outbox_events set delivery_state='DELIVERED',delivery_attempts=delivery_attempts+1,delivered_at=now(),updated_at=now(),last_failure=null where id=$1`,[event.id])
  return { proposal_id:proposalId, request_id:result.id||null, cost_microusd:cost, delivery_count:Number(metadata?.deliveryCount||1) }
}
async function mark(event,state,reason,runId) { const sql=db(); if(runId) await sql.query(`update control_analysis_runs set state=$1,failure_code=$2,completed_at=now() where id=$3`,[state,reason,runId]); await sql.query(`update control_outbox_events set delivery_state='FAILED',last_failure=$1,updated_at=now() where id=$2`,[reason,event.id]); await sql.query(`update control_tasks set state='BLOCKED',next_step='Review the visible analysis guard before explicitly retrying.',updated_at=now() where id=$1`,[event.task_id]); return {state,reason} }
module.exports={ analyse }
