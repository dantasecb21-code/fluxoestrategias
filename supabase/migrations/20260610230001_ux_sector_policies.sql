-- UX sector: column and RLS policies (separated from enum ADD VALUE due to PostgreSQL transaction constraint)

-- Add ux_assigned_to column to strategies
ALTER TABLE public.strategies
  ADD COLUMN IF NOT EXISTS ux_assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- RLS: ux_leader can view all non-deleted strategies
CREATE POLICY "ux_leader can view all strategies"
  ON public.strategies FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'ux_leader'
    )
  );

-- RLS: ux_leader can update strategies (to assign ux_collaborator)
CREATE POLICY "ux_leader can assign ux collaborator"
  ON public.strategies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'ux_leader'
    )
  )
  WITH CHECK (true);

-- RLS: ux_collaborator can view strategies assigned to them
CREATE POLICY "ux_collaborator can view assigned strategies"
  ON public.strategies FOR SELECT
  TO authenticated
  USING (
    ux_assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'ux_collaborator'
    )
  );

-- RLS: ux_collaborator can update categories on assigned strategies
CREATE POLICY "ux_collaborator can update assigned strategies"
  ON public.strategies FOR UPDATE
  TO authenticated
  USING (
    ux_assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'ux_collaborator'
    )
  )
  WITH CHECK (ux_assigned_to = auth.uid());
