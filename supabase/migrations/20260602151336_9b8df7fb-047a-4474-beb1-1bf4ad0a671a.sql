-- Allow strategic users who created a store request to keep viewing/updating it even if assigned to someone else
CREATE POLICY "Strategic can view created store_requests"
ON public.store_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'strategic'::app_role) AND auth.uid() = created_by);

CREATE POLICY "Strategic can update created store_requests"
ON public.store_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'strategic'::app_role) AND auth.uid() = created_by);

CREATE POLICY "Strategic can insert store_requests"
ON public.store_requests
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'strategic'::app_role) AND auth.uid() = created_by);

CREATE POLICY "Strategic can delete created store_requests"
ON public.store_requests
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'strategic'::app_role) AND auth.uid() = created_by);

-- Strategic assistants should see store requests of the strategic users they follow
CREATE POLICY "Strategic assistants view followed store_requests"
ON public.store_requests
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'strategic_assistant'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.strategic_assistant_links sal
    WHERE sal.assistant_user_id = auth.uid()
      AND (sal.strategic_user_id = store_requests.created_by OR sal.strategic_user_id = store_requests.assigned_to)
  )
);

CREATE POLICY "Strategic assistants update followed store_requests"
ON public.store_requests
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'strategic_assistant'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.strategic_assistant_links sal
    WHERE sal.assistant_user_id = auth.uid()
      AND (sal.strategic_user_id = store_requests.created_by OR sal.strategic_user_id = store_requests.assigned_to)
  )
);