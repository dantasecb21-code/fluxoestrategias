ALTER TABLE public.strategies ADD COLUMN ux_assigned_to UUID REFERENCES auth.users;
GRANT ALL ON public.strategies TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategies TO authenticated;
GRANT SELECT ON public.strategies TO anon;