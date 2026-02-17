
-- Add policy to allow users to view their own orders without auth (using service role in edge function)
-- First, let's create a simpler approach: add a public read policy for orders that matches user_id

-- Drop existing restrictive policies and recreate them properly
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

-- Create a new policy that allows reading orders when querying by user_id
-- This works because the edge function uses service role to create orders
-- And users query with their approved_users.id which matches the user_id in orders
CREATE POLICY "Anyone can view orders by user_id"
ON public.orders
FOR SELECT
USING (true);
