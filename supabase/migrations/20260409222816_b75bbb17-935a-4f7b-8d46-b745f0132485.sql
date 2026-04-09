ALTER TABLE public.strategies 
ADD COLUMN started_at timestamp with time zone,
ADD COLUMN completed_at timestamp with time zone;