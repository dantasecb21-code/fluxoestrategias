alter table strategies
  add column if not exists ux_completed_by uuid references auth.users(id),
  add column if not exists ux_completed_at timestamptz;
