DROP POLICY IF EXISTS "Strategic users can view all strategies" ON public.strategies;
DROP POLICY IF EXISTS "Strategic users can update all strategies" ON public.strategies;

CREATE POLICY "Strategic users can view own or assigned strategies"
ON public.strategies
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'strategic'::public.app_role)
  AND deleted_at IS NULL
  AND (
    auth.uid() = user_id
    OR auth.uid() = assigned_to
  )
);

CREATE POLICY "Strategic users can update own or assigned strategies"
ON public.strategies
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'strategic'::public.app_role)
  AND (
    auth.uid() = user_id
    OR auth.uid() = assigned_to
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'strategic'::public.app_role)
  AND (
    auth.uid() = user_id
    OR auth.uid() = assigned_to
  )
);

DROP POLICY IF EXISTS "Strategic can view all history" ON public.strategy_history;

CREATE POLICY "Strategic can view own or assigned strategy history"
ON public.strategy_history
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'strategic'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.strategies s
    WHERE s.id = strategy_history.strategy_id
      AND s.deleted_at IS NULL
      AND (
        s.user_id = auth.uid()
        OR s.assigned_to = auth.uid()
      )
  )
);