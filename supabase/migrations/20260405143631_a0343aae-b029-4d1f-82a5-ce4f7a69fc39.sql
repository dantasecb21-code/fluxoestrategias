
-- Allow operational users to view other operational users' profiles for the ranking
CREATE POLICY "Operational can view operational profiles for ranking"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'operational'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = profiles.user_id 
    AND ur.role = 'operational'
  )
);

-- Allow operational users to view all operational user roles for ranking
CREATE POLICY "Operational can view operational roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'operational'::app_role)
  AND role = 'operational'
);

-- Allow operational users to view all strategies (read-only) for ranking
CREATE POLICY "Operational can view all strategies for ranking"
ON public.strategies
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'operational'::app_role)
  AND deleted_at IS NULL
);
