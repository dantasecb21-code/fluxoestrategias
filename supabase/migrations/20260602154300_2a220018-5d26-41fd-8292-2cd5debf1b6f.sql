CREATE OR REPLACE FUNCTION public.enforce_admin_validation_on_strategy_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Só estratégias de 99Food exigem validação do administrador.
  -- iFood e demais plataformas vão direto pro gestor operacional.
  IF NEW.admin_approved IS NOT TRUE
     AND NEW.platform = '99food'
     AND NOT public.has_role(NEW.user_id, 'admin'::app_role)
     AND (NEW.status IS NULL OR NEW.status = 'in_progress') THEN
    NEW.status := 'pending_admin_approval';
  END IF;
  RETURN NEW;
END;
$function$;