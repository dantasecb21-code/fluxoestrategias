alter table strategies
  add column if not exists algorithm_return_priority text not null default 'medium';
