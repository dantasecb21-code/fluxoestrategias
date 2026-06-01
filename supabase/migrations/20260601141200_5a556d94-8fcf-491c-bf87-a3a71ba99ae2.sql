CREATE POLICY "Competitor analysts can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'competitor_analyst'::app_role));