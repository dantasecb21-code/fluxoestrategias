CREATE POLICY "Strategic assistants can update followed strategies"
ON public.strategies
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'strategic_assistant'::app_role)
  AND deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.strategic_assistant_links sal
    WHERE sal.assistant_user_id = auth.uid()
      AND (sal.strategic_user_id = strategies.user_id OR sal.strategic_user_id = strategies.assigned_to)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'strategic_assistant'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.strategic_assistant_links sal
    WHERE sal.assistant_user_id = auth.uid()
      AND (sal.strategic_user_id = strategies.user_id OR sal.strategic_user_id = strategies.assigned_to)
  )
);