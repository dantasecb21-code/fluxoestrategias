
-- Add platforms array column to profiles
ALTER TABLE public.profiles ADD COLUMN platforms text[] NOT NULL DEFAULT '{}';

-- Update handle_new_user to save platforms from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, whatsapp, email, approved, platforms)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'whatsapp', ''),
    COALESCE(NEW.email, ''),
    CASE WHEN NEW.email = 'igor.rodrigues.mibusca@gmail.com' THEN true ELSE false END,
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(
        CASE WHEN NEW.raw_user_meta_data->'platforms' IS NOT NULL 
             AND jsonb_typeof(NEW.raw_user_meta_data->'platforms') = 'array'
             THEN NEW.raw_user_meta_data->'platforms'
             ELSE '[]'::jsonb
        END
      )),
      '{}'
    )
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(
    (NEW.raw_user_meta_data->>'role')::app_role,
    'strategic'
  ));
  
  RETURN NEW;
END;
$function$;
