create table if not exists batman_privacy_requests (
  id uuid primary key,
  profile_id uuid references batman_profiles(id),
  request_type text not null check (request_type in ('access','correction','stop_processing','withdraw_consent','erase')),
  source_channel text not null check (source_channel in ('email','operator','telegram','web')),
  source_message_id text,
  received_at timestamptz not null default now(),
  identity_state text not null default 'pending' check (identity_state in ('pending','verified','rejected')),
  workflow_state text not null default 'received' check (workflow_state in (
    'received','identity_check','restricted','legal_review','approved','executing','completed','rejected','manual_review'
  )),
  processing_restricted_at timestamptz,
  response_due_at timestamptz not null,
  erasure_due_at timestamptz,
  completed_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default now(),
  unique(source_channel, source_message_id)
);

create index if not exists batman_privacy_requests_profile_state_idx
  on batman_privacy_requests(profile_id, workflow_state, received_at desc);

create table if not exists batman_retention_holds (
  id uuid primary key,
  profile_id uuid not null references batman_profiles(id),
  scope text not null check (scope in ('contract','accounting','tax','payout','dispute','security')),
  legal_basis text not null,
  retain_until timestamptz,
  state text not null default 'active' check (state in ('active','released')),
  created_at timestamptz not null default now(),
  released_at timestamptz
);

create index if not exists batman_retention_holds_active_idx
  on batman_retention_holds(profile_id, state, retain_until);

create table if not exists batman_erasure_jobs (
  id uuid primary key,
  privacy_request_id uuid not null references batman_privacy_requests(id),
  profile_id uuid not null references batman_profiles(id),
  target text not null check (target in (
    'postgres_candidate_pii','yandex_candidate_folder','telegram_contact','email_message','application_logs','backups'
  )),
  target_reference text,
  action text not null check (action in ('erase','anonymize','restrict','expire')),
  due_at timestamptz not null,
  state text not null default 'queued' check (state in ('queued','processing','verified','held','failed','manual_review')),
  hold_reason text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error_code text,
  verification_code text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(privacy_request_id, target)
);

create index if not exists batman_erasure_jobs_due_idx
  on batman_erasure_jobs(state, due_at);

create table if not exists batman_privacy_audit (
  id uuid primary key,
  privacy_request_id uuid not null references batman_privacy_requests(id),
  event_type text not null,
  actor_type text not null check (actor_type in ('system','operator','subject')),
  actor_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into schema_migrations(migration_id,checksum)
values ('0009_batman_privacy_erasure','20260928-batman-privacy-erasure-v1') on conflict do nothing;
