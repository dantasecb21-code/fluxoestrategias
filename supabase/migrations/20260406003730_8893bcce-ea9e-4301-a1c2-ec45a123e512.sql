
CREATE OR REPLACE FUNCTION public.update_store_count_on_strategy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- On INSERT: if assigned_to is set and strategy_type is 'initial', increment count
  IF TG_OP = 'INSERT' THEN
    IF NEW.assigned_to IS NOT NULL AND NEW.strategy_type = 'initial' AND NEW.deleted_at IS NULL THEN
      UPDATE public.profiles
      SET store_count = store_count + 1
      WHERE user_id = NEW.assigned_to;
    END IF;
    RETURN NEW;
  END IF;

  -- On UPDATE: handle assigned_to changes for initial strategies
  IF TG_OP = 'UPDATE' THEN
    -- Strategy soft-deleted: decrement from assigned
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL AND OLD.assigned_to IS NOT NULL AND OLD.strategy_type = 'initial' THEN
      UPDATE public.profiles
      SET store_count = GREATEST(store_count - 1, 0)
      WHERE user_id = OLD.assigned_to;
      RETURN NEW;
    END IF;

    -- Strategy restored: increment assigned
    IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL AND NEW.assigned_to IS NOT NULL AND NEW.strategy_type = 'initial' THEN
      UPDATE public.profiles
      SET store_count = store_count + 1
      WHERE user_id = NEW.assigned_to;
      RETURN NEW;
    END IF;

    -- assigned_to changed on active initial strategy
    IF NEW.deleted_at IS NULL AND NEW.strategy_type = 'initial' THEN
      IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
        IF OLD.assigned_to IS NOT NULL THEN
          UPDATE public.profiles
          SET store_count = GREATEST(store_count - 1, 0)
          WHERE user_id = OLD.assigned_to;
        END IF;
        IF NEW.assigned_to IS NOT NULL THEN
          UPDATE public.profiles
          SET store_count = store_count + 1
          WHERE user_id = NEW.assigned_to;
        END IF;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- On DELETE: decrement if was active initial strategy
  IF TG_OP = 'DELETE' THEN
    IF OLD.assigned_to IS NOT NULL AND OLD.strategy_type = 'initial' AND OLD.deleted_at IS NULL THEN
      UPDATE public.profiles
      SET store_count = GREATEST(store_count - 1, 0)
      WHERE user_id = OLD.assigned_to;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_update_store_count
AFTER INSERT OR UPDATE OR DELETE ON public.strategies
FOR EACH ROW
EXECUTE FUNCTION public.update_store_count_on_strategy();
