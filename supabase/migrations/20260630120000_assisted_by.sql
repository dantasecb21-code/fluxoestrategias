alter table strategies
  add column if not exists assisted_by_id uuid null,
  add column if not exists assisted_by_name text not null default '',
  add column if not exists assisted_at timestamptz null;
