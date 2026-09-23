const { neon } = require('@neondatabase/serverless')
const { send } = require('@vercel/queue')
const { randomUUID } = require('node:crypto')

const TOPIC = 'project-control-analysis-events'

function sql() {
  if (!process.env.DATABASE_URL) throw new Error('database_not_configured')
  return neon(process.env.DATABASE_URL)
}

function queuePayload(event) {
  return {
    event_id: event.id,
    task_id: event.task_id,
    revision_id: event.revision_id,
    operation: event.operation,
    correlation_id: event.correlation_id,
    scope: event.scope,
    classification: event.classification
  }
}

async function publishOutboxEvent(eventId) {
  const db = sql()
  const events = await db.query(`update control_outbox_events
    set delivery_state=case when delivery_state='FAILED' then 'RETRYING' else 'PUBLISHING' end,
        updated_at=now(), last_failure=null
    where id=$1 and delivery_state in ('PENDING','FAILED','RETRYING')
    returning id,task_id,revision_id,operation,idempotency_key,correlation_id,scope,classification`, [eventId])
  const event = events[0]
  if (!event) return { published: false, reason: 'event_not_publishable' }
  try {
    const sent = await send(TOPIC, queuePayload(event), {
      idempotencyKey: event.idempotency_key,
      retentionSeconds: 3600,
      headers: { 'x-project-control-correlation-id': event.correlation_id }
    })
    await db.query(`update control_outbox_events
      set delivery_state='PUBLISHED',queue_message_id=$1,published_at=now(),updated_at=now()
      where id=$2 and delivery_state in ('PUBLISHING','RETRYING')`, [String(sent.messageId || ''), event.id])
    await db.query(`insert into control_audit_events (id,task_id,event_type,actor_role,correlation_id,summary)
      values ($1,$2,'OUTBOX_PUBLISHED','system',$3,'One metadata-only outbox event was published to the internal Vercel Queue.')`, [randomUUID(), event.task_id, event.correlation_id])
    return { published: true, message_id: sent.messageId || null }
  } catch (error) {
    await db.query(`update control_outbox_events
      set delivery_state='FAILED',last_failure='queue_publish_failed',updated_at=now()
      where id=$1`, [event.id])
    await db.query(`insert into control_audit_events (id,task_id,event_type,actor_role,correlation_id,summary)
      values ($1,$2,'OUTBOX_PUBLISH_FAILED','system',$3,'Queue publish failed. No model or external action was started; owner may retry this same event.')`, [randomUUID(), event.task_id, event.correlation_id])
    throw error
  }
}

async function publishLatestPendingEvent(taskId) {
  const db = sql()
  const events = await db.query(`select id from control_outbox_events
    where task_id=$1 and operation='ANALYSE' and delivery_state in ('PENDING','FAILED','RETRYING')
    order by created_at desc limit 1`, [taskId])
  return events[0] ? publishOutboxEvent(events[0].id) : { published: false, reason: 'no_pending_event' }
}

async function acknowledgeQueueDelivery(message, metadata) {
  const eventId = typeof message?.event_id === 'string' ? message.event_id : ''
  const correlationId = typeof message?.correlation_id === 'string' ? message.correlation_id : ''
  if (!eventId || !correlationId || message.classification !== 'METADATA_ONLY' || message.operation !== 'ANALYSE') {
    throw new Error('invalid_project_control_queue_message')
  }
  const db = sql()
  const changed = await db.query(`update control_outbox_events
    set delivery_state='DELIVERED',delivery_attempts=delivery_attempts+1,delivered_at=now(),updated_at=now(),last_failure=null
    where id=$1 and correlation_id=$2 and delivery_state <> 'DELIVERED'
    returning task_id,correlation_id`, [eventId, correlationId])
  if (changed[0]) {
    await db.query(`insert into control_audit_events (id,task_id,event_type,actor_role,correlation_id,summary)
      values ($1,$2,'OUTBOX_DELIVERED','system',$3,'Vercel Queue delivered the metadata-only analysis event. No model or external action was called.')`, [randomUUID(), changed[0].task_id, changed[0].correlation_id])
  }
  return { acknowledged: true, delivery_count: Number(metadata?.deliveryCount || 1) }
}

module.exports = { TOPIC, publishLatestPendingEvent, acknowledgeQueueDelivery }
