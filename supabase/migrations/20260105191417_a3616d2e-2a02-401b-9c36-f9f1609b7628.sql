
-- Allow authenticated users to find their own approved_users record by email
CREATE POLICY "Users can view their own approved user record"
ON public.approved_users
FOR SELECT
USING (email = (SELECT auth.jwt() ->> 'email'));

-- Also allow users to view their own roles in user_roles
CREATE POLICY "Users can view own roles by approved_users email"
ON public.user_roles
FOR SELECT
USING (
  user_id IN (
    SELECT id FROM public.approved_users 
    WHERE email = (SELECT auth.jwt() ->> 'email')
  )
);
