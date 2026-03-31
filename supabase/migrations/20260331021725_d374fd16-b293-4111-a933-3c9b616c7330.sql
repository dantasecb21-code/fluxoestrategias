
-- Update handle_new_user to save whatsapp and default to strategic role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, whatsapp, approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'whatsapp', ''),
    CASE WHEN NEW.email = 'igor.rodrigues.mibusca@gmail.com' THEN true ELSE false END
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(
    (NEW.raw_user_meta_data->>'role')::app_role,
    'strategic'
  ));
  
  RETURN NEW;
END;
$$;

-- Strategic users can view all strategies
CREATE POLICY "Strategic users can view all strategies"
ON public.strategies
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'strategic'::app_role));

-- Strategic users can view all profiles
CREATE POLICY "Strategic users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'strategic'::app_role));
