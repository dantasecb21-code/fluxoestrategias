
-- Make strategy_id nullable and add store_request_id link
ALTER TABLE public.competitor_studies ALTER COLUMN strategy_id DROP NOT NULL;
ALTER TABLE public.competitor_studies ADD COLUMN IF NOT EXISTS store_request_id uuid;
CREATE INDEX IF NOT EXISTS idx_competitor_studies_store_request ON public.competitor_studies(store_request_id);

-- Trigger function: create competitor_study when store becomes "created"
CREATE OR REPLACE FUNCTION public.create_competitor_study_on_store_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_analyst uuid;
BEGIN
  IF NEW.store_creation_status = 'created'
     AND (TG_OP = 'INSERT' OR OLD.store_creation_status IS DISTINCT FROM 'created') THEN

    -- Skip if a study already exists for this store_request
    IF EXISTS (SELECT 1 FROM public.competitor_studies WHERE store_request_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    SELECT user_id INTO v_analyst FROM public.user_roles
     WHERE role = 'competitor_analyst'::app_role LIMIT 1;

    INSERT INTO public.competitor_studies
      (store_request_id, store_name, platform, strategic_user_id, assigned_to, status)
    VALUES
      (NEW.id, NEW.store_name, NEW.platform,
       COALESCE(NEW.assigned_to, NEW.created_by),
       v_analyst, 'pending');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_competitor_study_on_store_created ON public.store_requests;
CREATE TRIGGER trg_create_competitor_study_on_store_created
AFTER INSERT OR UPDATE OF store_creation_status ON public.store_requests
FOR EACH ROW
EXECUTE FUNCTION public.create_competitor_study_on_store_created();

-- Backfill: create studies for already-created stores without one
INSERT INTO public.competitor_studies (store_request_id, store_name, platform, strategic_user_id, assigned_to, status)
SELECT sr.id, sr.store_name, sr.platform,
       COALESCE(sr.assigned_to, sr.created_by),
       (SELECT user_id FROM public.user_roles WHERE role = 'competitor_analyst'::app_role LIMIT 1),
       'pending'
FROM public.store_requests sr
WHERE sr.store_creation_status = 'created'
  AND NOT EXISTS (SELECT 1 FROM public.competitor_studies cs WHERE cs.store_request_id = sr.id);
