DROP POLICY IF EXISTS "Strategic assistants can view operational roles" ON public.user_roles;
DROP POLICY IF EXISTS "Strategic assistants can view operational profiles" ON public.profiles;

CREATE POLICY "Strategic assistants can view operational roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'strategic_assistant'::public.app_role)
  AND role = 'operational'::public.app_role
);

CREATE POLICY "Strategic assistants can view operational profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'strategic_assistant'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = profiles.user_id
      AND ur.role = 'operational'::public.app_role
  )
);