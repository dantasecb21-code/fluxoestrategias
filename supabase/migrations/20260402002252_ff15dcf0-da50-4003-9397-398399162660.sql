
-- Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN email text NOT NULL DEFAULT '';

-- Create ai_context_entries table
CREATE TABLE public.ai_context_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  structured_summary text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_context_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all ai_context" ON public.ai_context_entries
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Strategic can view all ai_context" ON public.ai_context_entries
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'strategic'));

CREATE POLICY "Users can insert own ai_context" ON public.ai_context_entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Update handle_new_user to save email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, whatsapp, email, approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'whatsapp', ''),
    COALESCE(NEW.email, ''),
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

-- Create strategy-images bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('strategy-images', 'strategy-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view strategy images" ON storage.objects
  FOR SELECT USING (bucket_id = 'strategy-images');

CREATE POLICY "Authenticated users can upload strategy images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'strategy-images');
