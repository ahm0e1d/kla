-- Add video_url to site_settings if not exists
INSERT INTO public.site_settings (key, value)
VALUES ('video_url', '""')
ON CONFLICT (key) DO NOTHING;