-- User deck library: each row is a deck the user has explicitly imported.
-- This is separate from the analyses table (which stores AI results per deck).
-- A deck can be in the library without being analyzed yet.
CREATE TABLE IF NOT EXISTS user_decks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  moxfield_id TEXT NOT NULL,
  deck_name   TEXT,
  moxfield_url TEXT,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, moxfield_id)
);

ALTER TABLE user_decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own decks"
  ON user_decks FOR ALL
  USING (auth.uid() = user_id);
