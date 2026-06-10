CREATE OR REPLACE FUNCTION public.handle_study_requested()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.study_requested = TRUE AND (OLD IS NULL OR OLD.study_requested = FALSE)) THEN
        INSERT INTO public.competitor_studies (
            strategy_id,
            store_name,
            platform,
            strategic_user_id,
            status,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            NEW.store_name,
            NEW.platform,
            NEW.user_id,
            'pending',
            NOW(),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_handle_study_requested ON public.strategies;
CREATE TRIGGER tr_handle_study_requested
AFTER INSERT OR UPDATE ON public.strategies
FOR EACH ROW EXECUTE FUNCTION public.handle_study_requested();
