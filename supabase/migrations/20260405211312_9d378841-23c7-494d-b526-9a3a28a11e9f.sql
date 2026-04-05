
CREATE TABLE public.pending_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL DEFAULT '',
  store_name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  deadline TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_to UUID NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_activities ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage all pending_activities"
ON public.pending_activities FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Strategic full access
CREATE POLICY "Strategic can manage all pending_activities"
ON public.pending_activities FOR ALL TO authenticated
USING (has_role(auth.uid(), 'strategic'::app_role))
WITH CHECK (has_role(auth.uid(), 'strategic'::app_role));

-- Operational can view assigned
CREATE POLICY "Operational can view assigned pending_activities"
ON public.pending_activities FOR SELECT TO authenticated
USING (auth.uid() = assigned_to);

-- Operational can update assigned
CREATE POLICY "Operational can update assigned pending_activities"
ON public.pending_activities FOR UPDATE TO authenticated
USING (auth.uid() = assigned_to);

-- Timestamp trigger
CREATE TRIGGER update_pending_activities_updated_at
BEFORE UPDATE ON public.pending_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
