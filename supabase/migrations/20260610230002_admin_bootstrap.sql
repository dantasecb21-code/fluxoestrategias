-- Bootstrap admin for new project: auto-approve and assign admin role to master email

-- Update handle_new_user to recognize the new master admin email
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_master_admin boolean;
BEGIN
  is_master_admin := NEW.email IN ('igor.rodrigues.mibusca@gmail.com', 'matheus0ernesto@gmail.com');

  INSERT INTO public.profiles (user_id, display_name, whatsapp, email, approved, platforms)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'whatsapp', ''),
    COALESCE(NEW.email, ''),
    is_master_admin,
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
  VALUES (
    NEW.id,
    CASE WHEN is_master_admin THEN 'admin'::app_role
         ELSE COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'strategic'::app_role)
    END
  );

  RETURN NEW;
END;
$function$;

-- If the user already signed up, fix their profile and role now
UPDATE public.profiles
SET approved = true
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'matheus0ernesto@gmail.com');

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'matheus0ernesto@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
