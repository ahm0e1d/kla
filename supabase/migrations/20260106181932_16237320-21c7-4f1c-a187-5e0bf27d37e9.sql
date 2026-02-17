
-- Fix has_role function to look up user by email instead of direct id match
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    INNER JOIN public.approved_users au ON au.id = ur.user_id
    WHERE au.email = (SELECT auth.jwt() ->> 'email')
      AND ur.role = _role
      AND ur.removed_at IS NULL
  )
$$;
