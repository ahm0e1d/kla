
-- Add policy for admins to read all approved users data
CREATE POLICY "Admins can view all approved user details"
ON public.approved_users
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
