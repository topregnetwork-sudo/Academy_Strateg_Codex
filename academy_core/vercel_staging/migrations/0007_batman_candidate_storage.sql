create table if not exists batman_candidate_storage (
  profile_id uuid primary key references batman_profiles(id) on delete cascade,
  provider text not null default 'yandex_disk' check (provider = 'yandex_disk'),
  folder_name text not null,
  folder_path text not null unique,
  provider_resource_id text unique,
  folder_url text,
  provision_state text not null default 'queued'
    check (provision_state in ('queued','provisioning','ready','failed','manual_review')),
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists batman_candidate_files (
  id uuid primary key,
  profile_id uuid not null references batman_profiles(id) on delete cascade,
  storage_provider text not null default 'yandex_disk' check (storage_provider = 'yandex_disk'),
  category text not null check (category in (
    'questionnaire','assessment','productivity_interview','audio_video',
    'specialist_conclusion','consent','other'
  )),
  provider_resource_id text,
  file_name text not null,
  file_path text not null,
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  checksum_sha256 text,
  upload_state text not null default 'queued'
    check (upload_state in ('queued','uploading','ready','failed','manual_review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, file_path)
);

create index if not exists batman_candidate_files_profile_category_idx
  on batman_candidate_files(profile_id, category, created_at desc);

create table if not exists batman_storage_outbox (
  id uuid primary key,
  profile_id uuid not null references batman_profiles(id) on delete cascade,
  operation text not null check (operation in ('create_candidate_folder','upload_file','refresh_metadata')),
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  delivery_state text not null default 'queued'
    check (delivery_state in ('queued','processing','delivered','failed','manual_review')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  available_at timestamptz not null default now(),
  last_error_code text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

insert into schema_migrations(migration_id)
values ('0007_batman_candidate_storage') on conflict do nothing;
