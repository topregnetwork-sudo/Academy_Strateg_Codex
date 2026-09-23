-- Isolated Project Control staging: one event-driven, metadata-only cloud analysis.
begin;

create table if not exists control_analysis_runs (
  id uuid primary key,
  event_id uuid not null unique references control_outbox_events(id),
  task_id uuid not null references control_tasks(id),
  correlation_id uuid not null unique,
  provider_request_id text,
  state text not null check (state in ('CLAIMED','SUCCEEDED','FAILED','DEAD_LETTER','BUDGET_EXCEEDED','INPUT_BLOCKED')),
  input_tokens integer, output_tokens integer, reserved_microusd integer not null default 10000,
  actual_microusd integer, failure_code text, created_at timestamptz not null default now(), completed_at timestamptz
);
create index if not exists control_analysis_runs_task_created_idx on control_analysis_runs(task_id, created_at desc);

create table if not exists control_analysis_monthly_budget (
  month_start date primary key,
  event_count integer not null default 0, reserved_microusd bigint not null default 0,
  actual_microusd bigint not null default 0, updated_at timestamptz not null default now()
);

insert into schema_migrations(migration_id, checksum)
values ('0004_project_control_cloud_analyse', '20260914-project-control-cloud-analyse-v1')
on conflict (migration_id) do nothing;
commit;
