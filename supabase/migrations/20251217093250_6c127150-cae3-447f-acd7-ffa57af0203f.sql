-- Add user_id column to flats table for customer login ID
ALTER TABLE public.flats 
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Create function to generate unique user IDs
CREATE OR REPLACE FUNCTION generate_flat_user_id()
RETURNS TRIGGER AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  IF NEW.user_id IS NULL THEN
    FOR i IN 1..6 LOOP
      result := result || SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INTEGER, 1);
    END LOOP;
    NEW.user_id := result;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate user_id on insert
DROP TRIGGER IF EXISTS set_flat_user_id ON public.flats;
CREATE TRIGGER set_flat_user_id
BEFORE INSERT ON public.flats
FOR EACH ROW
EXECUTE FUNCTION generate_flat_user_id();

-- Generate user_ids for existing flats that don't have one
UPDATE public.flats
SET user_id = (
  SELECT string_agg(SUBSTR('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', FLOOR(RANDOM() * 32 + 1)::INTEGER, 1), '')
  FROM generate_series(1, 6)
)
WHERE user_id IS NULL;