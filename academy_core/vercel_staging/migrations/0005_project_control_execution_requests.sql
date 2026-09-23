-- Prompt 5: owner approval records a bounded request; it never starts execution.
begin;
create table if not exists control_execution_requests (
  id uuid primary key,
  task_id uuid not null references control_tasks(id),
  proposal_id uuid not null unique references control_proposals(id),
  scope text not null check (length(scope) between 1 and 20000),
  allowed_operation text not null check (allowed_operation in ('PREPARE_ONLY','READ_ONLY_VERIFY','LIVE_ACTION_REQUIRES_ACTION_TIME_CONFIRMATION')),
  risks text not null, verification_links text not null, rollback_plan text not null,
  state text not null check (state in ('PENDING_ACTION_TIME_CONFIRMATION','CANCELLED','RESULT_READY_FOR_OWNER_REVIEW','OWNER_ACCEPTED')),
  created_at timestamptz not null default now(), confirmed_at timestamptz, completed_at timestamptz
);
create index if not exists control_execution_requests_task_created_idx on control_execution_requests(task_id,created_at desc);
insert into schema_migrations(migration_id,checksum) values ('0005_project_control_execution_requests','20260915-project-control-execution-requests-v1') on conflict(migration_id) do nothing;
commit;
