
-- Fix user_roles policies: scope to authenticated + add explicit WITH CHECK
DROP POLICY "Admins can manage roles" ON user_roles;
CREATE POLICY "Admins can manage roles" ON user_roles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

ALTER POLICY "Users can view their own roles" ON user_roles TO authenticated;

-- Fix profiles policies: scope to authenticated
ALTER POLICY "Admins can view all profiles" ON profiles TO authenticated;
ALTER POLICY "Users can insert their own profile" ON profiles TO authenticated;
ALTER POLICY "Users can update their own profile" ON profiles TO authenticated;
ALTER POLICY "Users can view their own profile" ON profiles TO authenticated;

-- Fix strategies policies: scope to authenticated
ALTER POLICY "Users can create their own strategies" ON strategies TO authenticated;
ALTER POLICY "Users can delete their own strategies" ON strategies TO authenticated;
ALTER POLICY "Users can update their own strategies" ON strategies TO authenticated;
ALTER POLICY "Users can view their own strategies" ON strategies TO authenticated;
ALTER POLICY "Operational managers can update assigned strategies" ON strategies TO authenticated;
ALTER POLICY "Operational managers can view assigned strategies" ON strategies TO authenticated;
