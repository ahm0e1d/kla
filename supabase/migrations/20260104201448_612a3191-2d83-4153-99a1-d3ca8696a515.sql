-- Drop the restrictive policies
DROP POLICY IF EXISTS "Anyone can read active announcements" ON public.announcements;
DROP POLICY IF EXISTS "Service role can manage announcements" ON public.announcements;

DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Service role can manage site settings" ON public.site_settings;

-- Create permissive policies for announcements
CREATE POLICY "Anyone can read active announcements"
ON public.announcements
FOR SELECT
TO public
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Create permissive policies for site_settings
CREATE POLICY "Anyone can read site settings"
ON public.site_settings
FOR SELECT
TO public
USING (true);