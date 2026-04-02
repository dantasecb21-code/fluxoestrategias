CREATE POLICY "Admins can view all strategies"
ON public.strategies
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all strategies"
ON public.strategies
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all strategies"
ON public.strategies
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));