ALTER TABLE public.store_requests ADD COLUMN IF NOT EXISTS competitors text NOT NULL DEFAULT '';
ALTER TABLE public.competitor_studies ADD COLUMN IF NOT EXISTS competitors text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.create_competitor_study_on_store_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_analyst uuid;
BEGIN
  IF NEW.store_creation_status = 'created'
     AND (TG_OP = 'INSERT' OR OLD.store_creation_status IS DISTINCT FROM 'created') THEN

    IF EXISTS (SELECT 1 FROM public.competitor_studies WHERE store_request_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    SELECT user_id INTO v_analyst FROM public.user_roles
     WHERE role = 'competitor_analyst'::app_role LIMIT 1;

    INSERT INTO public.competitor_studies
      (store_request_id, store_name, platform, strategic_user_id, assigned_to, status, competitors)
    VALUES
      (NEW.id, NEW.store_name, NEW.platform,
       COALESCE(NEW.assigned_to, NEW.created_by),
       v_analyst, 'pending', COALESCE(NEW.competitors, ''));
  END IF;
  RETURN NEW;
END;
$function$;

-- Sync competitors from store_request to existing competitor_study when updated
CREATE OR REPLACE FUNCTION public.sync_competitors_to_study()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.competitors IS DISTINCT FROM OLD.competitors THEN
    UPDATE public.competitor_studies
       SET competitors = COALESCE(NEW.competitors, '')
     WHERE store_request_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_competitors_to_study ON public.store_requests;
CREATE TRIGGER trg_sync_competitors_to_study
AFTER UPDATE ON public.store_requests
FOR EACH ROW
EXECUTE FUNCTION public.sync_competitors_to_study();