-- First, drop the existing foreign key constraint
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

-- Delete orphaned records that don't have a matching approved_user
DELETE FROM public.user_roles 
WHERE user_id NOT IN (SELECT id FROM public.approved_users);

-- Add the new foreign key constraint that references approved_users
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.approved_users(id) ON DELETE CASCADE;