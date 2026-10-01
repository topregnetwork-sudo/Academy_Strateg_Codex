create table if not exists hh_chat_link_runs (
  run_id uuid primary key,
  snapshot_hash text not null check (snapshot_hash ~ '^[0-9a-f]{64}$'),
  observed_at timestamptz not null,
  counts jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists hh_chat_links (
  chat_alias text primary key,
  chat_id_box jsonb not null,
  vacancy_id text,
  vacancy_bucket text not null check (vacancy_bucket in ('CHELYABINSK_PROVEN','OTHER','UNKNOWN')),
  resume_key text,
  negotiation_id text,
  link_status text not null,
  identity_linked boolean not null default false,
  hh_state_known boolean not null default false,
  unread_count integer not null check (unread_count >= 0),
  last_message_marker text,
  participant_viewed_markers jsonb not null default '[]'::jsonb,
  run_id uuid not null references hh_chat_link_runs(run_id),
  observed_at timestamptz not null
);
create index if not exists hh_chat_links_run_idx on hh_chat_links(run_id, vacancy_bucket, chat_alias);
insert into schema_migrations(migration_id) values ('0013_hh_chat_links') on conflict do nothing;
