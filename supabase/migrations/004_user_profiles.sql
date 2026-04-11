-- MTG Assistant — User Profiles
-- Run in: Supabase → SQL Editor → New query → Run
-- =====================================================

-- user_profiles
-- Stores display username and avatar URL per user.
-- Row is created on first profile save; users who haven't saved a profile have no row.
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id    UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username   TEXT UNIQUE,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- username must be 3–20 chars, alphanumeric + hyphen + underscore (enforced in backend too)
ALTER TABLE user_profiles ADD CONSTRAINT username_format
  CHECK (
    username IS NULL OR (
      length(username) >= 3
      AND length(username) <= 20
      AND username ~ '^[a-zA-Z0-9_-]+$'
    )
  );

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read all profiles (needed for league standings display)
CREATE POLICY "Authenticated users can read profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only insert their own profile row
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own profile row
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- Supabase Storage — avatars bucket
-- =====================================================

-- Public bucket: the URL itself is not secret (profile pictures are public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Users can upload/overwrite only the file named their own user_id
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND name = auth.uid()::text);

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND name = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND name = auth.uid()::text);

-- Anyone (even unauthenticated) can read avatars (public profile pictures)
CREATE POLICY "Public avatar read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');
