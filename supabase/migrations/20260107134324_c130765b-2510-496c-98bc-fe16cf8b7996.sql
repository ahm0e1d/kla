-- Add new order statuses: accepted (in progress), rejected
-- No schema changes needed, just using text status field with new values

-- We'll use these statuses:
-- 'pending' - new order waiting
-- 'accepted' - admin accepted and is preparing  
-- 'rejected' - admin rejected with reason
-- 'completed' - order delivered

-- Add rejection_reason column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS handled_by_email TEXT,
ADD COLUMN IF NOT EXISTS handled_by_discord TEXT;