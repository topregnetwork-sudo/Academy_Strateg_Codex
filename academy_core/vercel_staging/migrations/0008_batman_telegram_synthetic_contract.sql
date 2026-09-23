alter table batman_telegram_updates
  add column if not exists payload jsonb not null default '{}'::jsonb;

create table if not exists batman_campaigns (
  id text primary key,
  campaign_kind text not null,
  audience_kind text not null,
  synthetic boolean not null default true,
  status text not null check (status in ('draft','queued','delivered','failed','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists batman_attendance_events (
  id uuid primary key,
  journey_id uuid references batman_journeys(id),
  campaign_id text references batman_campaigns(id),
  attendance_state text not null check (attendance_state in ('registered','attended','missed','unknown')),
  idempotency_key text not null unique,
  evidence jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null
);

create table if not exists batman_recording_events (
  id uuid primary key,
  journey_id uuid references batman_journeys(id),
  campaign_id text references batman_campaigns(id),
  event_type text not null check (event_type in ('recording_available','recording_opened','recording_completed')),
  idempotency_key text not null unique,
  evidence jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null
);

create table if not exists batman_referral_events (
  id uuid primary key,
  journey_id uuid references batman_journeys(id),
  referral_link_id uuid references batman_referral_links(id),
  event_type text not null check (event_type in ('link_issued','link_opened','application_started','application_completed','attribution_candidate','attribution_locked')),
  idempotency_key text not null unique,
  evidence jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null
);

insert into schema_migrations(migration_id)
values ('0008_batman_telegram_synthetic_contract') on conflict do nothing;
