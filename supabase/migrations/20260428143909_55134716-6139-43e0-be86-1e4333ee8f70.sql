DROP POLICY IF EXISTS "Admins can manage strategic assistant links" ON public.strategic_assistant_links;
DROP POLICY IF EXISTS "Strategic assistants can view followed strategies" ON public.strategies;
DROP POLICY IF EXISTS "Strategic assistants can view followed pending_activities" ON public.pending_activities;
DROP POLICY IF EXISTS "Strategic assistants can view followed strategy history" ON public.strategy_history;

CREATE POLICY "Admins can manage strategic assistant links"
ON public.strategic_assistant_links
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND public.has_role(assistant_user_id, 'strategic_assistant'::public.app_role)
  AND public.has_role(strategic_user_id, 'strategic'::public.app_role)
);

CREATE POLICY "Strategic assistants can view followed strategies"
ON public.strategies
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'strategic_assistant'::public.app_role)
  AND deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.strategic_assistant_links sal
    WHERE sal.assistant_user_id = auth.uid()
      AND (sal.strategic_user_id = strategies.user_id OR sal.strategic_user_id = strategies.assigned_to)
  )
);

CREATE POLICY "Strategic assistants can view followed pending_activities"
ON public.pending_activities
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'strategic_assistant'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.strategic_assistant_links sal
    WHERE sal.assistant_user_id = auth.uid()
      AND sal.strategic_user_id = pending_activities.created_by
  )
);

CREATE POLICY "Strategic assistants can view followed strategy history"
ON public.strategy_history
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'strategic_assistant'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.strategies s
    JOIN public.strategic_assistant_links sal
      ON sal.assistant_user_id = auth.uid()
     AND (sal.strategic_user_id = s.user_id OR sal.strategic_user_id = s.assigned_to)
    WHERE s.id = strategy_history.strategy_id
      AND s.deleted_at IS NULL
  )
);

DROP FUNCTION IF EXISTS public.get_followed_strategic_ids(uuid);
DROP FUNCTION IF EXISTS public.can_follow_strategic(uuid, uuid);