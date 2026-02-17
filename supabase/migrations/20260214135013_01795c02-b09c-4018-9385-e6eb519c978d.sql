-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule auto-store-status to run every minute
SELECT cron.schedule(
  'auto-store-status-check',
  '* * * * *',
  $$
  SELECT extensions.http_post(
    'https://sjjwswpxrjublpmrnoca.supabase.co/functions/v1/auto-store-status',
    '{}',
    'application/json',
    ARRAY[
      extensions.http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqandzd3B4cmp1YmxwbXJub2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyOTUzNTcsImV4cCI6MjA4Mjg3MTM1N30.SExQXk6dbLjUv0xiIXPImiUlfdKar00xkaom1q4rJD0')
    ]
  );
  $$
);
