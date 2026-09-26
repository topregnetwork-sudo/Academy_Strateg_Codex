create table if not exists receipts (
  receipt_hash text primary key,
  form_id text not null,
  state text not null check (state in ('processing','delivered')),
  message_id integer,
  created_at text not null
);
