
-- Create storage bucket for delivery proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('delivery-proofs', 'delivery-proofs', true);

-- Allow anyone to view delivery proofs
CREATE POLICY "Anyone can view delivery proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'delivery-proofs');

-- Allow authenticated uploads (service role will handle this via edge function)
CREATE POLICY "Service role can upload delivery proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'delivery-proofs');

CREATE POLICY "Service role can update delivery proofs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'delivery-proofs');
