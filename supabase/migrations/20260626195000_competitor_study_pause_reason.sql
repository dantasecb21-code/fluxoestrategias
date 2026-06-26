alter table competitor_studies
  add column if not exists pause_reason text not null default '';
