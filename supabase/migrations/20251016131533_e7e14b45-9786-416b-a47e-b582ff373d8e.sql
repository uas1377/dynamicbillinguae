-- Add buying_price column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS buying_price numeric DEFAULT 0;

COMMENT ON COLUMN public.products.buying_price IS 'Cost price for profit calculation (not shown in invoices)';