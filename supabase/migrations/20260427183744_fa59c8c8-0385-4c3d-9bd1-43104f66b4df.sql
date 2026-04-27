REVOKE EXECUTE ON FUNCTION public.check_and_increment_ai_usage() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_ai_usage() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_ai_usage() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_usage() TO service_role;

CREATE OR REPLACE FUNCTION public.get_ai_usage_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
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

REVOKE EXECUTE ON FUNCTION public.get_ai_usage_status() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_ai_usage_status() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_ai_usage_status() TO authenticated;