
CREATE TABLE public.strategy_save_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  strategy_id uuid,
  store_name text NOT NULL DEFAULT '',
  operational_manager text NOT NULL DEFAULT '',
  is_new boolean NOT NULL DEFAULT true,
  outcome text NOT NULL,
  reason text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.strategy_save_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own save attempts"
  ON public.strategy_save_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all save attempts"
  ON public.strategy_save_attempts FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own save attempts"
  ON public.strategy_save_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_strategy_save_attempts_created_at ON public.strategy_save_attempts(created_at DESC);
CREATE INDEX idx_strategy_save_attempts_user_id ON public.strategy_save_attempts(user_id);
