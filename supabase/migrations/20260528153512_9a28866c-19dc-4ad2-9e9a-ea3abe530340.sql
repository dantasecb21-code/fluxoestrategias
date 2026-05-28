ALTER TABLE public.strategies
ADD COLUMN IF NOT EXISTS replaces_strategy_id uuid;

CREATE INDEX IF NOT EXISTS idx_strategies_replaces ON public.strategies(replaces_strategy_id);