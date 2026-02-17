-- Add responsible admin tracking columns to approved_users
ALTER TABLE public.approved_users 
ADD COLUMN IF NOT EXISTS approved_by_email text,
ADD COLUMN IF NOT EXISTS approved_by_discord text;

-- Add responsible admin tracking columns to pending_users for deactivation
ALTER TABLE public.pending_users 
ADD COLUMN IF NOT EXISTS deactivated_by_email text,
ADD COLUMN IF NOT EXISTS deactivated_by_discord text;

-- Add demotion reason and responsible admin to user_roles
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS removed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS removed_by_email text,
ADD COLUMN IF NOT EXISTS removed_by_discord text,
ADD COLUMN IF NOT EXISTS removal_reason text,
ADD COLUMN IF NOT EXISTS added_by_email text,
ADD COLUMN IF NOT EXISTS added_by_discord text;