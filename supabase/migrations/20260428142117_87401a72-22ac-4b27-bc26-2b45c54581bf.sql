CREATE TABLE IF NOT EXISTS public.strategic_assistant_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_user_id uuid NOT NULL,
  strategic_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (assistant_user_id),
  CHECK (assistant_user_id <> strategic_user_id)
);

ALTER TABLE public.strategic_assistant_links ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_followed_strategic_ids(_user_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(strategic_user_id), '{}'::uuid[])
  FROM public.strategic_assistant_links
  WHERE assistant_user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.can_follow_strategic(_assistant_user_id uuid, _strategic_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_assistant_user_id, 'strategic_assistant'::public.app_role)
    AND public.has_role(_strategic_user_id, 'strategic'::public.app_role)
$$;

DROP POLICY IF EXISTS "Admins can manage strategic assistant links" ON public.strategic_assistant_links;
DROP POLICY IF EXISTS "Assistants can view own strategic link" ON public.strategic_assistant_links;
DROP POLICY IF EXISTS "Strategic users can view assistant links" ON public.strategic_assistant_links;

CREATE POLICY "Admins can manage strategic assistant links"
ON public.strategic_assistant_links
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND public.can_follow_strategic(assistant_user_id, strategic_user_id)
);

CREATE POLICY "Assistants can view own strategic link"
ON public.strategic_assistant_links
FOR SELECT
TO authenticated
USING (auth.uid() = assistant_user_id);

CREATE POLICY "Strategic users can view assistant links"
ON public.strategic_assistant_links
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'strategic'::public.app_role)
  AND auth.uid() = strategic_user_id
);

DROP POLICY IF EXISTS "Strategic users can view all strategies" ON public.strategies;
DROP POLICY IF EXISTS "Strategic users can update all strategies" ON public.strategies;
DROP POLICY IF EXISTS "Strategic users can view own or assigned strategies" ON public.strategies;
DROP POLICY IF EXISTS "Strategic users can update own or assigned strategies" ON public.strategies;
DROP POLICY IF EXISTS "Strategic assistants can view followed strategies" ON public.strategies;

CREATE POLICY "Strategic users can view own or assigned strategies"
ON public.strategies
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'strategic'::public.app_role)
  AND deleted_at IS NULL
  AND (auth.uid() = user_id OR auth.uid() = assigned_to)
);

CREATE POLICY "Strategic users can update own or assigned strategies"
ON public.strategies
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'strategic'::public.app_role)
  AND (auth.uid() = user_id OR auth.uid() = assigned_to)
)
WITH CHECK (
  public.has_role(auth.uid(), 'strategic'::public.app_role)
  AND (auth.uid() = user_id OR auth.uid() = assigned_to)
);

CREATE POLICY "Strategic assistants can view followed strategies"
ON public.strategies
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'strategic_assistant'::public.app_role)
  AND deleted_at IS NULL
  AND (
    user_id = ANY(public.get_followed_strategic_ids(auth.uid()))
    OR assigned_to = ANY(public.get_followed_strategic_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Strategic can manage all pending_activities" ON public.pending_activities;
DROP POLICY IF EXISTS "Strategic can manage own pending_activities" ON public.pending_activities;
DROP POLICY IF EXISTS "Strategic assistants can view followed pending_activities" ON public.pending_activities;

CREATE POLICY "Strategic can manage own pending_activities"
ON public.pending_activities
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'strategic'::public.app_role)
  AND created_by = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'strategic'::public.app_role)
  AND created_by = auth.uid()
);

CREATE POLICY "Strategic assistants can view followed pending_activities"
ON public.pending_activities
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'strategic_assistant'::public.app_role)
  AND created_by = ANY(public.get_followed_strategic_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Strategic can view all history" ON public.strategy_history;
DROP POLICY IF EXISTS "Strategic can view own or assigned strategy history" ON public.strategy_history;
DROP POLICY IF EXISTS "Strategic assistants can view followed strategy history" ON public.strategy_history;

CREATE POLICY "Strategic can view own or assigned strategy history"
ON public.strategy_history
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'strategic'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.strategies s
    WHERE s.id = strategy_history.strategy_id
      AND s.deleted_at IS NULL
      AND (s.user_id = auth.uid() OR s.assigned_to = auth.uid())
  )
);

CREATE POLICY "Strategic assistants can view followed strategy history"
ON public.strategy_history
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'strategic_assistant'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.strategies s
    WHERE s.id = strategy_history.strategy_id
      AND s.deleted_at IS NULL
      AND (
        s.user_id = ANY(public.get_followed_strategic_ids(auth.uid()))
        OR s.assigned_to = ANY(public.get_followed_strategic_ids(auth.uid()))
      )
  )
);

DROP TRIGGER IF EXISTS update_strategic_assistant_links_updated_at ON public.strategic_assistant_links;
CREATE TRIGGER update_strategic_assistant_links_updated_at
BEFORE UPDATE ON public.strategic_assistant_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();