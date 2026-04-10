-- MTG Assistant — Initial Schema
-- Run this in: Supabase → SQL Editor → New query → Run
-- =====================================================

-- 1. allowed_users
-- Admin-managed allow-list. Add a row per approved user email.
CREATE TABLE IF NOT EXISTS allowed_users (
  email TEXT PRIMARY KEY
);

-- 2. decks
-- Shared cache of Moxfield deck data. Fetched once, reused across all users.
CREATE TABLE IF NOT EXISTS decks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moxfield_id TEXT NOT NULL UNIQUE,
  data_json   JSONB NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS decks_moxfield_id_idx ON decks (moxfield_id);

-- 3. analyses
-- Per-user deck analysis history.
CREATE TABLE IF NOT EXISTS analyses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  deck_id     TEXT NOT NULL,   -- moxfield_id of the deck
  result_json JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analyses_user_id_idx ON analyses (user_id, created_at DESC);

-- 4. collections
-- One row per user. Upserted on every CSV upload.
CREATE TABLE IF NOT EXISTS collections (
  user_id    UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  cards_json JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE decks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections    ENABLE ROW LEVEL SECURITY;

-- allowed_users: only the service role can read/write (backend uses service key for this check)
-- No user-facing RLS policy needed — access controlled in FastAPI auth.py

-- decks: any authenticated user can read; only service role can insert/update
CREATE POLICY "Authenticated users can read decks"
  ON decks FOR SELECT
  TO authenticated
  USING (true);

-- analyses: users can only read and insert their own rows
CREATE POLICY "Users can read own analyses"
  ON analyses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses"
  ON analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- collections: users can only read and upsert their own row
CREATE POLICY "Users can read own collection"
  ON collections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own collection"
  ON collections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collection"
  ON collections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
