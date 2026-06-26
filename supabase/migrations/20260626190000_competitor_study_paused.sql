alter table competitor_studies
  add column if not exists paused boolean not null default false;
