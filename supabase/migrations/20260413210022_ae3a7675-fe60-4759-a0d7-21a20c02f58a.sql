-- Backfill started_at for strategies that have activity but null started_at
-- Uses the earliest strategy_history record or falls back to created_at
UPDATE strategies s
SET started_at = COALESCE(
  (SELECT MIN(sh.created_at) FROM strategy_history sh WHERE sh.strategy_id = s.id),
  s.created_at
)
WHERE s.started_at IS NULL
  AND s.deleted_at IS NULL
  AND s.status IN ('in_progress', 'completed', 'pending_approval', 'approved', 'returned');