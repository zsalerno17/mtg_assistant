-- AI response cache: store strategy/improvements by deck_id + type.
-- This prevents re-calling Gemini for the same deck on every page load.
CREATE TABLE IF NOT EXISTS ai_cache (
  deck_id    TEXT NOT NULL,
  cache_type TEXT NOT NULL,   -- 'strategy' | 'improvements'
  result     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (deck_id, cache_type)
);

ALTER TABLE ai_cache ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (cached results are not user-specific for
-- strategy/improvements; scenarios are user-specific so they are NOT cached here)
CREATE POLICY "Authenticated users can read ai_cache"
  ON ai_cache FOR SELECT TO authenticated USING (true);
