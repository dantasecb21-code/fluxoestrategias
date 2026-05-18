
ALTER TABLE public.occurrences
  ADD COLUMN IF NOT EXISTS creator_role text NOT NULL DEFAULT 'operational';

-- replace insert policy: anyone authenticated can insert their own
DROP POLICY IF EXISTS "Operational can insert own occurrences" ON public.occurrences;
CREATE POLICY "Anyone can insert own occurrences" ON public.occurrences
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = operational_manager_id);

-- replace select policy: anyone can see their own
DROP POLICY IF EXISTS "Operational can view own occurrences" ON public.occurrences;
CREATE POLICY "Anyone can view own occurrences" ON public.occurrences
  FOR SELECT TO authenticated
  USING (auth.uid() = operational_manager_id);

-- replace update policy: anyone can update their own
DROP POLICY IF EXISTS "Operational can update own open occurrences" ON public.occurrences;
CREATE POLICY "Anyone can update own occurrences" ON public.occurrences
  FOR UPDATE TO authenticated
  USING (auth.uid() = operational_manager_id);
