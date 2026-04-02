CREATE TABLE public.training_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage training_courses"
ON public.training_courses FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Strategic full access
CREATE POLICY "Strategic can manage training_courses"
ON public.training_courses FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'strategic'))
WITH CHECK (public.has_role(auth.uid(), 'strategic'));

-- Operational can view published
CREATE POLICY "Operational can view published training"
ON public.training_courses FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'operational') AND published = true);

-- Timestamp trigger
CREATE TRIGGER update_training_courses_updated_at
BEFORE UPDATE ON public.training_courses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();