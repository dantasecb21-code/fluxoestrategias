
CREATE TABLE public.base_strategy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  assigned_to uuid NOT NULL,
  store_name text NOT NULL DEFAULT '',
  operational_manager text NOT NULL DEFAULT '',
  platform text NOT NULL DEFAULT '99food',
  observation text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.base_strategy_requests TO authenticated;
GRANT ALL ON public.base_strategy_requests TO service_role;

ALTER TABLE public.base_strategy_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all base_strategy_requests"
  ON public.base_strategy_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Assistants insert own base_strategy_requests"
  ON public.base_strategy_requests FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'strategic_assistant'::app_role) AND auth.uid() = created_by);

CREATE POLICY "Assistants view own base_strategy_requests"
  ON public.base_strategy_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'strategic_assistant'::app_role) AND auth.uid() = created_by);

CREATE POLICY "Assistants update own base_strategy_requests"
  ON public.base_strategy_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'strategic_assistant'::app_role) AND auth.uid() = created_by);

CREATE POLICY "Assistants delete own base_strategy_requests"
  ON public.base_strategy_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'strategic_assistant'::app_role) AND auth.uid() = created_by);

CREATE POLICY "Strategic view assigned base_strategy_requests"
  ON public.base_strategy_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'strategic'::app_role) AND auth.uid() = assigned_to);

CREATE POLICY "Strategic update assigned base_strategy_requests"
  ON public.base_strategy_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'strategic'::app_role) AND auth.uid() = assigned_to);

CREATE TRIGGER set_base_strategy_requests_updated_at
  BEFORE UPDATE ON public.base_strategy_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
