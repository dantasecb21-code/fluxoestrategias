ALTER TABLE public.strategies ADD COLUMN IF NOT EXISTS study_requested BOOLEAN DEFAULT FALSE;
GRANT ALL ON public.strategies TO service_role;
GRANT ALL ON public.strategies TO authenticated;
