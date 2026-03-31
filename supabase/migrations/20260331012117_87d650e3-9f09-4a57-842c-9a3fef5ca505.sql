
-- Add approved column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false;

-- Auto-approve the master admin
UPDATE public.profiles SET approved = true WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'igor.rodrigues.mibusca@gmail.com'
);

-- Ensure master admin has admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'igor.rodrigues.mibusca@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Policy: admins can update any profile (for approval)
CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: admins can delete profiles
CREATE POLICY "Admins can delete profiles" ON public.profiles
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update handle_new_user to auto-approve the master admin email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    CASE WHEN NEW.email = 'igor.rodrigues.mibusca@gmail.com' THEN true ELSE false END
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(
    (NEW.raw_user_meta_data->>'role')::app_role,
    'admin'
  ));
  
  RETURN NEW;
END;
$function$;
