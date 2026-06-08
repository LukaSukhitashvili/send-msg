-- Run this in Supabase Dashboard → SQL Editor → New Query
-- This creates the messages table and storage bucket

-- 0. Ensure pgcrypto is enabled (required for gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  image_paths TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can INSERT (public submissions)
CREATE POLICY "Anyone can insert messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (true);

-- Policy: Anyone can SELECT (public read + admin dashboard)
CREATE POLICY "Anyone can view messages"
  ON public.messages
  FOR SELECT
  USING (true);

-- Policy: Only authenticated users can DELETE (optional - for admin cleanup)
-- CREATE POLICY "Authenticated can delete messages"
--   ON public.messages
--   FOR DELETE
--   USING (auth.role() = 'authenticated');
CREATE POLICY "Anyone can delete messages"
  ON public.messages
  FOR DELETE
  USING (true);

-- 2. Create storage bucket for images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies
-- Public read access
CREATE POLICY "Public read access"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'images');

-- Anyone can upload (public submissions)
CREATE POLICY "Anyone can upload images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'images');

-- Authenticated users can delete (for admin cleanup)
CREATE POLICY "Authenticated can delete images"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'images' AND auth.role() = 'authenticated');

-- 4. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_created_at
  ON public.messages (created_at DESC);

-- 5. Optional: Add trigger to auto-clean old messages (e.g., keep last 1000)
-- CREATE OR REPLACE FUNCTION trim_old_messages()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   DELETE FROM public.messages
--   WHERE id NOT IN (
--     SELECT id FROM public.messages
--     ORDER BY created_at DESC
--     LIMIT 1000
--   );
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
-- CREATE TRIGGER trim_messages_after_insert
-- AFTER INSERT ON public.messages
-- FOR EACH ROW EXECUTE FUNCTION trim_old_messages();