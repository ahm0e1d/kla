-- Add unique constraint on site_settings key column for proper upsert
ALTER TABLE public.site_settings ADD CONSTRAINT site_settings_key_unique UNIQUE (key);