-- Create pending_users table for registration approval
CREATE TABLE public.pending_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  discord_username TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID
);

-- Enable RLS
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage pending users
CREATE POLICY "Admins can view pending users"
ON public.pending_users
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update pending users"
ON public.pending_users
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert pending users (for registration)"
ON public.pending_users
FOR INSERT
WITH CHECK (true);

-- Create approved_users table for approved accounts
CREATE TABLE public.approved_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  discord_username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.approved_users ENABLE ROW LEVEL SECURITY;

-- Only admins can manage approved users
CREATE POLICY "Admins can view approved users"
ON public.approved_users
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert approved users"
ON public.approved_users
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete approved users"
ON public.approved_users
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));