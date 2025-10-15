-- Create storage bucket for business logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for business logos bucket
CREATE POLICY "Anyone can view business logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-logos');

CREATE POLICY "Admins can upload business logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'business-logos');

CREATE POLICY "Admins can update business logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'business-logos');

CREATE POLICY "Admins can delete business logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'business-logos');