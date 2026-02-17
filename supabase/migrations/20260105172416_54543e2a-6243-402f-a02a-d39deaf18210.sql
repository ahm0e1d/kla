
-- Drop the problematic policy that references auth.users incorrectly
DROP POLICY IF EXISTS "Users can view their own custom roles" ON public.user_custom_roles;

-- Create a simpler policy for users to view their own roles
-- This uses a direct subquery on approved_users instead
CREATE POLICY "Users can view own custom roles"
ON public.user_custom_roles
FOR SELECT
USING (
  user_id IN (
    SELECT au.id FROM public.approved_users au 
    WHERE au.id = user_id
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);
