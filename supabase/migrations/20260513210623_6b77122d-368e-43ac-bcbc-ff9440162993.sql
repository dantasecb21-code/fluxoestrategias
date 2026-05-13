
-- Safeguard: if a strategist (non-admin) creates a strategy without admin approval,
-- force status to 'pending_admin_approval' so it goes to admin validation first.
CREATE OR REPLACE FUNCTION public.enforce_admin_validation_on_strategy_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.admin_approved IS NOT TRUE
     AND NOT public.has_role(NEW.user_id, 'admin'::app_role)
     AND (NEW.status IS NULL OR NEW.status = 'in_progress') THEN
    NEW.status := 'pending_admin_approval';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_admin_validation_on_strategy_insert ON public.strategies;
CREATE TRIGGER enforce_admin_validation_on_strategy_insert
BEFORE INSERT ON public.strategies
FOR EACH ROW
EXECUTE FUNCTION public.enforce_admin_validation_on_strategy_insert();

-- Fix the two stuck strategies created by Filipe before this safeguard
UPDATE public.strategies
SET status = 'pending_admin_approval', updated_at = now()
WHERE id IN (
  '798421c7-0ef5-4c01-a06e-52bf968f1a58',
  '54deebc0-c7c3-478f-867e-d8ccba270582'
);
