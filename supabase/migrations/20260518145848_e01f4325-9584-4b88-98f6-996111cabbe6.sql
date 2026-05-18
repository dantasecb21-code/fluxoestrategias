
CREATE TABLE public.occurrences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id text NOT NULL DEFAULT '',
  occurrence_date date NOT NULL DEFAULT CURRENT_DATE,
  occurrence_time text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  operational_manager_id uuid NOT NULL,
  operational_manager_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  resolution text NOT NULL DEFAULT '',
  resolved_by uuid,
  resolved_by_name text NOT NULL DEFAULT '',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operational can insert own occurrences" ON public.occurrences
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = operational_manager_id);

CREATE POLICY "Operational can view own occurrences" ON public.occurrences
  FOR SELECT TO authenticated
  USING (auth.uid() = operational_manager_id);

CREATE POLICY "Operational can update own open occurrences" ON public.occurrences
  FOR UPDATE TO authenticated
  USING (auth.uid() = operational_manager_id);

CREATE POLICY "Strategic can view all occurrences" ON public.occurrences
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'strategic'::app_role));

CREATE POLICY "Strategic can update all occurrences" ON public.occurrences
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'strategic'::app_role));

CREATE POLICY "Strategic assistant can view all occurrences" ON public.occurrences
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'strategic_assistant'::app_role));

CREATE POLICY "Strategic assistant can update all occurrences" ON public.occurrences
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'strategic_assistant'::app_role));

CREATE POLICY "Admins can view all occurrences" ON public.occurrences
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all occurrences" ON public.occurrences
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete occurrences" ON public.occurrences
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_occurrences_updated_at
  BEFORE UPDATE ON public.occurrences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.occurrences;
ALTER TABLE public.occurrences REPLICA IDENTITY FULL;
