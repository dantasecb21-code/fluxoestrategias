CREATE POLICY "Strategic assistants can update followed pending_activities"
ON public.pending_activities
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'strategic_assistant'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.strategic_assistant_links sal
    WHERE sal.assistant_user_id = auth.uid()
      AND sal.strategic_user_id = pending_activities.created_by
  )
)
WITH CHECK (
  has_role(auth.uid(), 'strategic_assistant'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.strategic_assistant_links sal
    WHERE sal.assistant_user_id = auth.uid()
      AND sal.strategic_user_id = pending_activities.created_by
  )
);