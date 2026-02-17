-- Add column to store original password (for admin recovery purposes)
ALTER TABLE public.approved_users 
ADD COLUMN IF NOT EXISTS password_plain TEXT;

-- Also add to pending_users for new registrations
ALTER TABLE public.pending_users 
ADD COLUMN IF NOT EXISTS password_plain TEXT;