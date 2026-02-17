
-- Drop the problematic policies
DROP POLICY IF EXISTS "Allow insert orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

-- Create secure policies

-- Users can only view their own orders (by matching their email from approved_users)
CREATE POLICY "Users can view their own orders"
ON public.orders
FOR SELECT
USING (
  user_id IN (
    SELECT id FROM public.approved_users 
    WHERE email = (SELECT auth.jwt() ->> 'email')
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Only authenticated users with an approved account can create orders
CREATE POLICY "Authenticated users can create orders"
ON public.orders
FOR INSERT
WITH CHECK (
  user_id IN (
    SELECT id FROM public.approved_users 
    WHERE email = (SELECT auth.jwt() ->> 'email')
  )
);
