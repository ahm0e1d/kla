-- Add a policy for users to view their own custom roles
CREATE POLICY "Users can view their own custom roles"
ON public.user_custom_roles
FOR SELECT
USING (
  user_id IN (
    SELECT au.id FROM public.approved_users au 
    WHERE au.email = (SELECT auth.jwt() ->> 'email')
  )
);

-- Add a policy for users to view custom_roles table (they need to see role permissions)
CREATE POLICY "Authenticated users can view custom roles"
ON public.custom_roles
FOR SELECT
USING (true);