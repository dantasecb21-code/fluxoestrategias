alter table strategies
  add column if not exists algorithm_pause_reason text not null default '';
