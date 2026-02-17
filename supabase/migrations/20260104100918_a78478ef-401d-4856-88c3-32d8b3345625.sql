-- Add deactivation_reason column to pending_users
ALTER TABLE public.pending_users ADD COLUMN IF NOT EXISTS deactivation_reason text;