UPDATE public.strategies
SET status = 'pending_admin_approval', updated_at = now()
WHERE status = 'in_progress'
  AND admin_approved = false
  AND deleted_at IS NULL
  AND started_at IS NULL;