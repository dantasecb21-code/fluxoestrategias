-- Create strategy_history table (was created manually in the original project)
CREATE TABLE IF NOT EXISTS public.strategy_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  action text NOT NULL DEFAULT '',
  field_changed text NOT NULL DEFAULT '',
  old_value text NOT NULL DEFAULT '',
  new_value text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.strategy_history ENABLE ROW LEVEL SECURITY;

-- Admin can view all history
CREATE POLICY "Admin can view all strategy history"
  ON public.strategy_history FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Strategic can view all history (will be replaced by a scoped policy later)
CREATE POLICY "Strategic can view all history"
  ON public.strategy_history FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'strategic'::public.app_role));

-- Operational can view history of assigned strategies
CREATE POLICY "Operational can view assigned strategy history"
  ON public.strategy_history FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'operational'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.strategies s
      WHERE s.id = strategy_history.strategy_id AND s.assigned_to = auth.uid()
    )
  );

-- Authenticated users can insert history records
CREATE POLICY "Authenticated users can insert strategy history"
  ON public.strategy_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
