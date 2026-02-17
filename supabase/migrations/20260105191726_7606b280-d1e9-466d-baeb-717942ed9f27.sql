
-- Allow admins to delete orders (for rejected/cancelled orders)
CREATE POLICY "Admins can delete orders"
ON public.orders
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update approved_users
CREATE POLICY "Admins can update approved users"
ON public.approved_users
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
