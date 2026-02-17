
-- Create custom_roles table for defining roles with permissions
CREATE TABLE public.custom_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT
);

-- Enable RLS
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

-- Policies for custom_roles
CREATE POLICY "Admins can view custom roles"
ON public.custom_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert custom roles"
ON public.custom_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update custom roles"
ON public.custom_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete custom roles"
ON public.custom_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create user_custom_roles junction table
CREATE TABLE public.user_custom_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.approved_users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by TEXT,
  UNIQUE(user_id, role_id)
);

-- Enable RLS
ALTER TABLE public.user_custom_roles ENABLE ROW LEVEL SECURITY;

-- Policies for user_custom_roles
CREATE POLICY "Admins can view user custom roles"
ON public.user_custom_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert user custom roles"
ON public.user_custom_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete user custom roles"
ON public.user_custom_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users with custom roles can view their own roles
CREATE POLICY "Users can view their own custom roles"
ON public.user_custom_roles
FOR SELECT
USING (user_id IN (SELECT id FROM public.approved_users WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())));
