
ALTER TABLE public.strategies
ADD COLUMN store_request_id uuid REFERENCES public.store_requests(id) ON DELETE CASCADE;
