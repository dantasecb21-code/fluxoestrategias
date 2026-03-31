-- Add status_text to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_text text NOT NULL DEFAULT '';

-- Create strategy_notes table for free-form notes
CREATE TABLE public.strategy_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.strategy_notes ENABLE ROW LEVEL SECURITY;

-- Users can manage their own notes
CREATE POLICY "Users can manage own notes" ON public.strategy_notes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Admin and strategic can view all notes
CREATE POLICY "Admin can view all notes" ON public.strategy_notes FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Strategic can view all notes" ON public.strategy_notes FOR SELECT TO authenticated USING (has_role(auth.uid(), 'strategic'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_strategy_notes_updated_at BEFORE UPDATE ON public.strategy_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();