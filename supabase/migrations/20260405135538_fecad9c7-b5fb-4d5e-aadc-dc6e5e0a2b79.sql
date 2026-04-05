
CREATE TABLE public.store_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_name TEXT NOT NULL DEFAULT '',
  client_name TEXT NOT NULL DEFAULT '',
  store_created BOOLEAN NOT NULL DEFAULT false,
  platform_access_confirmed BOOLEAN NOT NULL DEFAULT false,
  meeting_date TEXT NOT NULL DEFAULT '',
  observation TEXT NOT NULL DEFAULT '',
  assigned_to UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.store_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all store_requests"
ON public.store_requests FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Strategic can view assigned store_requests"
ON public.store_requests FOR SELECT
TO authenticated
USING (auth.uid() = assigned_to);

CREATE POLICY "Strategic can update assigned store_requests"
ON public.store_requests FOR UPDATE
TO authenticated
USING (auth.uid() = assigned_to);

CREATE TRIGGER update_store_requests_updated_at
BEFORE UPDATE ON public.store_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
