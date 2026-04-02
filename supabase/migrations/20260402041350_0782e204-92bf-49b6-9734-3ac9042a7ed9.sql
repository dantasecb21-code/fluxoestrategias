CREATE POLICY "Strategic users can update all strategies"
ON public.strategies FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'strategic'::app_role))
WITH CHECK (has_role(auth.uid(), 'strategic'::app_role));