-- Project Control staging only: append-only event outbox.
-- No personal data, prompt text, credentials, external payload or model result
-- is placed in this transport. Queue messages contain IDs and classification.

begin;

create table if not exists control_outbox_events (
  id uuid primary key,
  task_id uuid not null references control_tasks(id),
  revision_id uuid not null references control_task_revisions(id),
  operation text not null check (operation in ('ANALYSE', 'PREPARE', 'EXECUTE_APPROVED', 'VERIFY')),
  idempotency_key text not null unique check (length(idempotency_key) between 24 and 200),
  correlation_id uuid not null unique,
  scope text not null check (length(scope) between 1 and 12000),
  classification text not null check (classification in ('METADATA_ONLY', 'LIVE_ACTION_REQUIRES_CONFIRMATION')),
  delivery_state text not null check (delivery_state in ('PENDING', 'PUBLISHING', 'PUBLISHED', 'DELIVERED', 'RETRYING', 'FAILED')),
  queue_message_id text check (length(queue_message_id) <= 200),
  delivery_attempts integer not null default 0 check (delivery_attempts >= 0),
  last_failure text check (length(last_failure) <= 1000),
  published_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists control_outbox_task_created_idx
  on control_outbox_events(task_id, created_at desc);
create index if not exists control_outbox_delivery_idx
  on control_outbox_events(delivery_state, created_at asc)
  where delivery_state in ('PENDING', 'RETRYING', 'FAILED');

create or replace function control_create_task_and_enqueue(
  p_project_name text,
  p_project_kind text,
  p_title text,
  p_priority text,
  p_next_step text,
  p_body text,
  p_task_id uuid,
  p_project_id uuid,
  p_revision_id uuid,
  p_event_id uuid,
  p_correlation_id uuid,
  p_audit_id uuid
) returns uuid language plpgsql as $$
declare v_project_id uuid;
begin
  select id into v_project_id from control_projects
    where lower(name)=lower(p_project_name) and kind=p_project_kind and archived_at is null limit 1;
  if v_project_id is null then
    v_project_id := p_project_id;
    insert into control_projects (id,name,kind) values (v_project_id,p_project_name,p_project_kind);
  end if;
  insert into control_tasks (id,project_id,title,priority,state,next_step)
    values (p_task_id,v_project_id,p_title,p_priority,'QUEUED_FOR_ANALYSIS',p_next_step);
  insert into control_task_revisions (id,task_id,ordinal,event_type,author_role,body,source_reference)
    values (p_revision_id,p_task_id,1,'IDEA_CREATED','owner',p_body,'Project Control owner entry');
  insert into control_outbox_events (id,task_id,revision_id,operation,idempotency_key,correlation_id,scope,classification,delivery_state)
    values (p_event_id,p_task_id,p_revision_id,'ANALYSE','analysis-' || p_task_id || '-1',p_correlation_id,'Project Control metadata-only analysis','METADATA_ONLY','PENDING');
  insert into control_audit_events (id,task_id,event_type,actor_role,correlation_id,summary)
    values (p_audit_id,p_task_id,'ANALYSIS_REQUESTED','owner',p_correlation_id,'Owner created a metadata-only task and one durable analysis outbox event.');
  return p_task_id;
end $$;

create or replace function control_revise_task_and_enqueue(
  p_task_id uuid, p_body text, p_next_step text, p_revision_id uuid, p_event_id uuid, p_correlation_id uuid, p_audit_id uuid
) returns uuid language plpgsql as $$
declare v_ordinal integer;
begin
  select coalesce(max(ordinal),0)+1 into v_ordinal from control_task_revisions where task_id=p_task_id;
  if not exists (select 1 from control_tasks where id=p_task_id and archived_at is null) then raise exception 'task_not_found'; end if;
  insert into control_task_revisions (id,task_id,ordinal,event_type,author_role,body,source_reference)
    values (p_revision_id,p_task_id,v_ordinal,'OWNER_CLARIFIED','owner',p_body,'Project Control owner clarification');
  insert into control_outbox_events (id,task_id,revision_id,operation,idempotency_key,correlation_id,scope,classification,delivery_state)
    values (p_event_id,p_task_id,p_revision_id,'ANALYSE','analysis-' || p_task_id || '-' || v_ordinal,p_correlation_id,'Project Control metadata-only analysis','METADATA_ONLY','PENDING');
  update control_tasks set state='QUEUED_FOR_ANALYSIS',next_step=p_next_step,updated_at=now() where id=p_task_id;
  insert into control_audit_events (id,task_id,event_type,actor_role,correlation_id,summary)
    values (p_audit_id,p_task_id,'OWNER_CLARIFIED','owner',p_correlation_id,'Owner clarification and its one durable analysis outbox event were stored atomically.');
  return p_event_id;
end $$;

create or replace function control_queue_task_analysis(
  p_task_id uuid, p_revision_id uuid, p_event_id uuid, p_correlation_id uuid, p_audit_id uuid
) returns uuid language plpgsql as $$
declare v_ordinal integer; v_existing uuid;
begin
  select id into v_existing from control_outbox_events
    where task_id=p_task_id and operation='ANALYSE' and delivery_state in ('PENDING','PUBLISHING','PUBLISHED','DELIVERED','RETRYING')
    order by created_at desc limit 1;
  if v_existing is not null then return v_existing; end if;
  select coalesce(max(ordinal),0)+1 into v_ordinal from control_task_revisions where task_id=p_task_id;
  if not exists (select 1 from control_tasks where id=p_task_id and archived_at is null) then raise exception 'task_not_found'; end if;
  insert into control_task_revisions (id,task_id,ordinal,event_type,author_role,body,source_reference)
    values (p_revision_id,p_task_id,v_ordinal,'CODEX_ANALYSIS','owner','Владелец отправил задачу на событийный разбор. Внешние действия и модель не запускаются.','Project Control event outbox');
  insert into control_outbox_events (id,task_id,revision_id,operation,idempotency_key,correlation_id,scope,classification,delivery_state)
    values (p_event_id,p_task_id,p_revision_id,'ANALYSE','analysis-' || p_task_id || '-' || v_ordinal,p_correlation_id,'Project Control metadata-only analysis','METADATA_ONLY','PENDING');
  update control_tasks set state='QUEUED_FOR_ANALYSIS',updated_at=now() where id=p_task_id;
  insert into control_audit_events (id,task_id,event_type,actor_role,correlation_id,summary)
    values (p_audit_id,p_task_id,'ANALYSIS_REQUESTED','owner',p_correlation_id,'Owner requested one metadata-only analysis event.');
  return p_event_id;
end $$;

insert into schema_migrations(migration_id, checksum)
values ('0003_project_control_event_outbox', '20260914-project-control-event-outbox-v1')
on conflict (migration_id) do nothing;

commit;
