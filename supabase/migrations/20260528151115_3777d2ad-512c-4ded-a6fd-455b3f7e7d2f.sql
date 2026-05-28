
-- Create competitor_studies table
CREATE TABLE IF NOT EXISTS public.competitor_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL,
  store_name text NOT NULL DEFAULT '',
  platform text NOT NULL DEFAULT '99food',
  strategic_user_id uuid NOT NULL,
  assigned_to uuid,
  status text NOT NULL DEFAULT 'pending',
  notes text NOT NULL DEFAULT '',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitor_studies TO authenticated;
GRANT ALL ON public.competitor_studies TO service_role;

ALTER TABLE public.competitor_studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all competitor_studies"
ON public.competitor_studies FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Competitor analysts view all studies"
ON public.competitor_studies FOR SELECT
USING (public.has_role(auth.uid(), 'competitor_analyst'::app_role));

CREATE POLICY "Competitor analysts update all studies"
ON public.competitor_studies FOR UPDATE
USING (public.has_role(auth.uid(), 'competitor_analyst'::app_role));

CREATE POLICY "Strategic users view own studies"
ON public.competitor_studies FOR SELECT
USING (public.has_role(auth.uid(), 'strategic'::app_role) AND strategic_user_id = auth.uid());

CREATE POLICY "Strategic assistants view followed studies"
ON public.competitor_studies FOR SELECT
USING (public.has_role(auth.uid(), 'strategic_assistant'::app_role) AND EXISTS (
  SELECT 1 FROM public.strategic_assistant_links sal
  WHERE sal.assistant_user_id = auth.uid() AND sal.strategic_user_id = competitor_studies.strategic_user_id
));

CREATE POLICY "System insert competitor_studies"
ON public.competitor_studies FOR INSERT
WITH CHECK (true);

CREATE TRIGGER update_competitor_studies_updated_at
BEFORE UPDATE ON public.competitor_studies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: auto-create competitor_study on new strategy
CREATE OR REPLACE FUNCTION public.create_competitor_study_on_strategy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_analyst uuid;
BEGIN
  SELECT user_id INTO v_analyst FROM public.user_roles
   WHERE role = 'competitor_analyst'::app_role LIMIT 1;

  INSERT INTO public.competitor_studies (strategy_id, store_name, platform, strategic_user_id, assigned_to, status)
  VALUES (NEW.id, NEW.store_name, NEW.platform, NEW.user_id, v_analyst, 'pending');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_strategy_created_create_study
AFTER INSERT ON public.strategies
FOR EACH ROW EXECUTE FUNCTION public.create_competitor_study_on_strategy();

-- Add Algorithm Adaptation columns to strategies
ALTER TABLE public.strategies
  ADD COLUMN IF NOT EXISTS algorithm_adaptation_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS algorithm_adaptation_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS algorithm_adaptation_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS algorithm_return_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS algorithm_approved_by uuid,
  ADD COLUMN IF NOT EXISTS algorithm_approved_at timestamptz;

-- Trigger: when strategy becomes 'approved' (admin approved), enter algorithm adaptation
CREATE OR REPLACE FUNCTION public.handle_strategy_approval_to_algorithm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved'
     AND (OLD.status IS DISTINCT FROM 'approved')
     AND NEW.algorithm_adaptation_status = 'none' THEN
    NEW.algorithm_adaptation_started_at := now();
    NEW.algorithm_adaptation_deadline := now() + interval '10 days';
    NEW.algorithm_adaptation_status := 'pending';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER strategy_approved_enter_algorithm
BEFORE UPDATE ON public.strategies
FOR EACH ROW EXECUTE FUNCTION public.handle_strategy_approval_to_algorithm();
