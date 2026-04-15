-- Personal/standalone game log — no league required.
-- Each row is one game session from the perspective of the logged-in user.
-- Other players are anonymous; pod context is captured by pod_size.

CREATE TABLE IF NOT EXISTS personal_games (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  played_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  pod_size    INT NOT NULL CHECK (pod_size BETWEEN 2 AND 10),
  placement   INT NOT NULL CHECK (placement >= 1),
  deck_id     UUID REFERENCES user_decks(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE personal_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own personal games"
  ON personal_games FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_personal_games_user_played
  ON personal_games(user_id, played_at DESC);

CREATE INDEX idx_personal_games_deck
  ON personal_games(deck_id)
  WHERE deck_id IS NOT NULL;
