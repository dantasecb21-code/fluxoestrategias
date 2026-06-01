DROP TRIGGER IF EXISTS trg_strategy_approval_to_algorithm ON public.strategies;

CREATE TRIGGER trg_strategy_approval_to_algorithm
BEFORE UPDATE ON public.strategies
FOR EACH ROW
EXECUTE FUNCTION public.handle_strategy_approval_to_algorithm();