
-- Attach the trigger to auth.users if not exists
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also fix any existing record for igor that might be unapproved
UPDATE public.profiles SET approved = true WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'igor.rodrigues.mibusca@gmail.com'
);
