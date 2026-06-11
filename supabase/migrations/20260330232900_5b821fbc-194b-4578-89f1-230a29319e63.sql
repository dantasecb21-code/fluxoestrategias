-- Insert missing admin role for existing user (skip if user doesn't exist in new project)
INSERT INTO public.user_roles (user_id, role)
SELECT '463389ec-c2e9-41c3-8326-4906a90dccf0', 'admin'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = '463389ec-c2e9-41c3-8326-4906a90dccf0')
ON CONFLICT (user_id, role) DO NOTHING;