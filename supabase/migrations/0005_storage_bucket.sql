-- ==============================================================================
-- SmartDine Migration 0005: Supabase Storage Bucket for Food & Brand Images
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Public can view menu images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'menu-images');

CREATE POLICY "Owner and manager can upload menu images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'menu-images'
    AND public.is_active_staff(ARRAY['owner', 'manager'])
  );

CREATE POLICY "Owner and manager can update menu images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND public.is_active_staff(ARRAY['owner', 'manager'])
  )
  WITH CHECK (
    bucket_id = 'menu-images'
    AND public.is_active_staff(ARRAY['owner', 'manager'])
  );

CREATE POLICY "Owner and manager can delete menu images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND public.is_active_staff(ARRAY['owner', 'manager'])
  );
