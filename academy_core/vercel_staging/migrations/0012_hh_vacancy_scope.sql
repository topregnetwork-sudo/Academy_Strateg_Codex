alter table hh_vacancies add column if not exists city_classification text not null default 'UNKNOWN'
  check (city_classification in ('CHELYABINSK_PROVEN','OTHER','UNKNOWN'));
alter table hh_vacancies add column if not exists area_id text;
alter table hh_vacancies add column if not exists area_name text;
create index if not exists hh_vacancies_city_idx
  on hh_vacancies(host, employer_id, city_classification);
insert into schema_migrations(migration_id) values ('0012_hh_vacancy_scope') on conflict do nothing;
