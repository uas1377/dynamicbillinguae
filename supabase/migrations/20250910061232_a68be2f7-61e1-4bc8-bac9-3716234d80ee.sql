-- Add discount_limit column to products table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'discount_limit'
    ) THEN
        ALTER TABLE public.products ADD COLUMN discount_limit numeric DEFAULT 0;
    END IF;
END $$;

-- Enable pg_cron extension for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to keep database active (runs every 5 minutes)
SELECT cron.schedule(
  'keep-database-active',
  '*/5 * * * *',
  $$
  select
    net.http_post(
        url:='https://yidujufgbevuzwzodjln.supabase.co/functions/v1/keep-alive',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHVqdWZnYmV2dXp3em9kamxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwOTg0NjcsImV4cCI6MjA3MjY3NDQ2N30.HtjdsAaZb5wNMW8XyTn-oWoNtqw0kFRub-fUnl-ZejM"}'::jsonb,
        body:='{"source": "cron"}'::jsonb
    ) as request_id;
  $$
);

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;