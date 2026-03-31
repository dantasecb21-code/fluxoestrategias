CREATE POLICY "Strategic users can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'strategic'::app_role));