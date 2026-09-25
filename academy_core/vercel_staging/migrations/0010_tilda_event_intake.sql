create table if not exists tilda_inbound_submissions (
  id uuid primary key,
  project_id text not null,
  form_id text not null,
  transaction_id text not null,
  test_submission boolean not null default false,
  payload_fingerprint text not null,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  unique(project_id, form_id, transaction_id)
);

create table if not exists event_registrations (
  id uuid primary key,
  inbound_submission_id uuid not null unique references tilda_inbound_submissions(id),
  event_code text not null,
  city text not null,
  identity_key text not null,
  campaign_id text not null,
  route_version integer not null,
  source text not null default 'tilda',
  status text not null default 'registered',
  created_at timestamptz not null default now(),
  unique(event_code, identity_key)
);

create table if not exists event_registration_outbox (
  id uuid primary key,
  registration_id uuid not null unique references event_registrations(id),
  effect_kind text not null default 'telegram_forum_mirror',
  chat_id bigint not null,
  message_thread_id bigint not null,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  delivery_state text not null default 'held' check (delivery_state in ('held','queued','processing','delivered','failed')),
  delivery_attempts integer not null default 0,
  telegram_message_id bigint,
  last_error text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create index if not exists event_registration_outbox_delivery_idx
  on event_registration_outbox(delivery_state, created_at);

insert into schema_migrations(migration_id)
values ('0010_tilda_event_intake') on conflict do nothing;
