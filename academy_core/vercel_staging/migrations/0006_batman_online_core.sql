create table if not exists schema_migrations (
  migration_id text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists batman_profiles (
  id uuid primary key,
  application_code_hash text not null unique,
  full_name text not null,
  city text not null,
  telegram_username text,
  phone text,
  motivation text,
  questionnaire_version integer not null,
  consent_version text not null,
  consent_accepted_at timestamptz not null,
  source_id text not null,
  campaign_id text,
  inviter_code text,
  synthetic boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists batman_journeys (
  id uuid primary key,
  profile_id uuid not null references batman_profiles(id),
  entry_route text not null check (entry_route in ('new_batman','trainer_reserve')),
  trainer_candidate_id text,
  current_stage text not null,
  next_action text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists batman_telegram_identities (
  telegram_user_id bigint primary key,
  journey_id uuid not null references batman_journeys(id),
  chat_id bigint not null,
  username text,
  linked_at timestamptz not null default now(),
  unique(journey_id)
);

create table if not exists batman_telegram_updates (
  bot_key text not null,
  update_id bigint not null,
  journey_id uuid,
  normalized_command text,
  processed_at timestamptz not null default now(),
  primary key(bot_key, update_id)
);

create table if not exists batman_zoom_slots (
  id uuid primary key,
  label text not null,
  starts_at timestamptz not null,
  meeting_url_encrypted text not null,
  capacity integer,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists batman_zoom_bookings (
  id uuid primary key,
  journey_id uuid not null references batman_journeys(id),
  slot_id uuid not null references batman_zoom_slots(id),
  active boolean not null default true,
  booked_at timestamptz not null default now()
);
create unique index if not exists batman_one_active_booking on batman_zoom_bookings(journey_id) where active;

create table if not exists batman_activations (
  journey_id uuid primary key references batman_journeys(id),
  btm_id text not null unique,
  readiness_version text not null,
  activated_at timestamptz not null default now()
);

create table if not exists batman_referral_links (
  id uuid primary key,
  journey_id uuid not null references batman_journeys(id),
  btm_id text not null,
  purpose text not null check (purpose in ('owner_invite','batman_invite')),
  opaque_code_hash text not null unique,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  unique(btm_id,purpose)
);

create table if not exists batman_domain_events (
  id uuid primary key,
  journey_id uuid,
  event_type text not null,
  idempotency_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists batman_telegram_outbox (
  id uuid primary key,
  journey_id uuid,
  chat_id bigint not null,
  message_kind text not null,
  payload jsonb not null,
  idempotency_key text not null unique,
  delivery_state text not null default 'queued',
  telegram_message_id bigint,
  last_error text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create or replace view operator_batman_queue as
select j.id as journey_id,p.full_name,p.city,p.telegram_username,j.entry_route,
       j.current_stage,j.next_action,a.btm_id,j.updated_at
from batman_journeys j
join batman_profiles p on p.id=j.profile_id
left join batman_activations a on a.journey_id=j.id;

insert into schema_migrations(migration_id)
values ('0006_batman_online_core') on conflict do nothing;
