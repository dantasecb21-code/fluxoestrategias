CREATE POLICY "Strategic assistants can view strategic roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'strategic_assistant'::app_role) AND role = 'strategic'::app_role);

CREATE POLICY "Strategic assistants can view strategic profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'strategic_assistant'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = profiles.user_id AND ur.role = 'strategic'::app_role
  )
);