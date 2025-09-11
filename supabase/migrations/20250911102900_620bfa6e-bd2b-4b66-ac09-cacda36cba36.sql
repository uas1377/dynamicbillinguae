-- Clear existing data
DELETE FROM invoices;
DELETE FROM customers;  
DELETE FROM products;

-- Create admin_settings table for admin credentials and business settings
CREATE TABLE public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (since this is admin data)
CREATE POLICY "Allow all operations on admin_settings" 
ON public.admin_settings 
FOR ALL
USING (true);

-- Create cashiers table 
CREATE TABLE public.cashiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cashiers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations on cashiers
CREATE POLICY "Allow all operations on cashiers" 
ON public.cashiers 
FOR ALL
USING (true);

-- Add trigger for updating timestamps
CREATE TRIGGER update_admin_settings_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cashiers_updated_at
BEFORE UPDATE ON public.cashiers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default admin credentials
INSERT INTO public.admin_settings (setting_key, setting_value) VALUES 
('admin_credentials', '{"username": "aaa", "password": "aaa"}'),
('business_settings', '{"name": "", "address": "", "phone": "", "email": ""}');

-- Insert default cashier
INSERT INTO public.cashiers (username, password, name) VALUES 
('aaa', 'aaa', 'Default Cashier');