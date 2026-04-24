/*
  # Create Course Images Storage Bucket

  ## Summary
  Creates a public Supabase storage bucket for storing academy course cover images.
  Admins can upload images, and all authenticated/public users can read them.

  ## Changes
  - Creates the `course-images` storage bucket (public)
  - Policy: admins can upload/delete images
  - Policy: anyone can read images (public bucket)
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-images',
  'course-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can upload course images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'course-images'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can delete course images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'course-images'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Anyone can read course images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-images');
