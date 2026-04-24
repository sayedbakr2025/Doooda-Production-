/*
  # Create storage bucket for institution works files

  Creates a storage bucket for institution works uploaded files (PDFs, Word docs, text files).
  Upload is handled via edge function with service role key to bypass RLS since
  institutional accounts use a custom auth system (not Supabase auth).

  The bucket is private - files are accessed via signed URLs generated server-side.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'institution-works',
  'institution-works',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;
