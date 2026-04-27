CREATE TABLE IF NOT EXISTS public.ai_quota_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_limit integer NOT NULL DEFAULT 1000,
  warning_threshold_pct integer NOT NULL DEFAULT 90,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

INSERT INTO public.ai_quota_settings (monthly_limit, warning_threshold_pct)
SELECT 1000, 90
WHERE NOT EXISTS (SELECT 1 FROM public.ai_quota_settings);

UPDATE public.ai_quota_settings
SET monthly_limit = 1000,
    warning_threshold_pct = 90,
    updated_at = now()
WHERE id IN (
  SELECT id FROM public.ai_quota_settings ORDER BY updated_at DESC LIMIT 1
);

ALTER TABLE public.ai_quota_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_quota_settings'
      AND policyname = 'Anyone authenticated can view quota settings'
  ) THEN
    CREATE POLICY "Anyone authenticated can view quota settings"
      ON public.ai_quota_settings
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_quota_settings'
      AND policyname = 'Admins can update quota settings'
  ) THEN
    CREATE POLICY "Admins can update quota settings"
      ON public.ai_quota_settings
      FOR UPDATE
      TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year_month text NOT NULL UNIQUE,
  call_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_usage'
      AND policyname = 'Anyone authenticated can view ai_usage'
  ) THEN
    CREATE POLICY "Anyone authenticated can view ai_usage"
      ON public.ai_usage
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.check_and_increment_ai_usage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month text := to_char(now(), 'YYYY-MM');
  v_limit integer;
  v_threshold_pct integer;
  v_threshold_value integer;
  v_current integer;
BEGIN
  SELECT monthly_limit, warning_threshold_pct
  INTO v_limit, v_threshold_pct
  FROM public.ai_quota_settings
  ORDER BY updated_at DESC LIMIT 1;

  IF v_limit IS NULL THEN
    v_limit := 1000;
    v_threshold_pct := 90;
    INSERT INTO public.ai_quota_settings (monthly_limit, warning_threshold_pct)
    VALUES (v_limit, v_threshold_pct);
  END IF;

  v_threshold_value := GREATEST(0, (v_limit * v_threshold_pct) / 100);

  INSERT INTO public.ai_usage (year_month, call_count)
  VALUES (v_month, 0)
  ON CONFLICT (year_month) DO NOTHING;

  SELECT call_count INTO v_current FROM public.ai_usage WHERE year_month = v_month;

  IF v_current >= v_threshold_value THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'blocked', true,
      'current', v_current,
      'limit', v_limit,
      'threshold', v_threshold_value,
      'threshold_pct', v_threshold_pct,
      'reason', 'FREE_SAFETY_LIMIT'
    );
  END IF;

  UPDATE public.ai_usage
  SET call_count = call_count + 1, updated_at = now()
  WHERE year_month = v_month
  RETURNING call_count INTO v_current;

  RETURN jsonb_build_object(
    'allowed', true,
    'blocked', false,
    'current', v_current,
    'limit', v_limit,
    'threshold', v_threshold_value,
    'threshold_pct', v_threshold_pct
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ai_usage_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month text := to_char(now(), 'YYYY-MM');
  v_limit integer;
  v_threshold_pct integer;
  v_current integer;
BEGIN
  SELECT monthly_limit, warning_threshold_pct INTO v_limit, v_threshold_pct
  FROM public.ai_quota_settings ORDER BY updated_at DESC LIMIT 1;

  SELECT COALESCE(call_count, 0) INTO v_current
  FROM public.ai_usage WHERE year_month = v_month;

  RETURN jsonb_build_object(
    'current', COALESCE(v_current, 0),
    'limit', COALESCE(v_limit, 1000),
    'threshold_pct', COALESCE(v_threshold_pct, 90),
    'threshold', (COALESCE(v_limit, 1000) * COALESCE(v_threshold_pct, 90)) / 100,
    'year_month', v_month
  );
END;
$$;