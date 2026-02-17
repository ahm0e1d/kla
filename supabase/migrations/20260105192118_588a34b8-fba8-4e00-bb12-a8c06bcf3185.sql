
-- Remove plain text password columns for security
ALTER TABLE public.pending_users DROP COLUMN IF EXISTS password_plain;
ALTER TABLE public.approved_users DROP COLUMN IF EXISTS password_plain;
