
-- Drop existing policies on user_custom_roles
DROP POLICY IF EXISTS "Users can view own custom roles" ON public.user_custom_roles;
DROP POLICY IF EXISTS "Admins can view user custom roles" ON public.user_custom_roles;

-- Create a simple policy that allows admins to do everything
CREATE POLICY "Admins full access to user_custom_roles"
ON public.user_custom_roles
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
