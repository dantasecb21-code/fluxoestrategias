
CREATE TABLE public.strategy_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  action text NOT NULL DEFAULT '',
  field_changed text NOT NULL DEFAULT '',
  old_value text NOT NULL DEFAULT '',
  new_value text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.strategy_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all history"
  ON public.strategy_history FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Strategic can view all history"
  ON public.strategy_history FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'strategic'::app_role));

CREATE POLICY "Operational can view assigned strategy history"
  ON public.strategy_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.strategies s
      WHERE s.id = strategy_id AND s.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Users can view own strategy history"
  ON public.strategy_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.strategies s
      WHERE s.id = strategy_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can insert history"
  ON public.strategy_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_strategy_history_strategy_id ON public.strategy_history(strategy_id);
CREATE INDEX idx_strategy_history_created_at ON public.strategy_history(created_at DESC);
