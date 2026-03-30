-- Insert missing admin role for existing user
INSERT INTO public.user_roles (user_id, role)
VALUES ('463389ec-c2e9-41c3-8326-4906a90dccf0', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;