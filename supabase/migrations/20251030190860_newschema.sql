/*
  # Add API Key Storage and Image Bucket

  1. New Table
    - `user_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key) - Reference to auth.users
      - `gemini_api_key` (text, encrypted) - Store encrypted API key
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Storage
    - Create chat-images bucket for image uploads
    - Set appropriate permissions
*/

-- Create user_settings table for storing API keys
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  gemini_api_key text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Enable Row Level Security
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings table
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON user_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create storage bucket for chat images
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for chat-images bucket
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-images');

CREATE POLICY "Authenticated users can view images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-images');

CREATE POLICY "Users can update own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);