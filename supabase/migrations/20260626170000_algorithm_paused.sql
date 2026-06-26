alter table strategies
  add column if not exists algorithm_paused boolean not null default false;
