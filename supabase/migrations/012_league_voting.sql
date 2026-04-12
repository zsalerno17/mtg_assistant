-- League game voting: members vote on social awards after each game
-- Each member casts one vote per award category per game

CREATE TABLE IF NOT EXISTS league_game_votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID NOT NULL REFERENCES league_games(id) ON DELETE CASCADE,
  voter_id    UUID NOT NULL REFERENCES league_members(id) ON DELETE CASCADE,
  category    TEXT NOT NULL CHECK (category IN ('entrance', 'spicy_play')),
  nominee_id  UUID NOT NULL REFERENCES league_members(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, voter_id, category) -- One vote per category per voter per game
);

ALTER TABLE league_game_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members see votes in their leagues"
  ON league_game_votes FOR SELECT
  USING (
    game_id IN (
      SELECT id FROM league_games WHERE league_id IN (
        SELECT league_id FROM league_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can cast votes"
  ON league_game_votes FOR INSERT
  WITH CHECK (
    voter_id IN (SELECT id FROM league_members WHERE user_id = auth.uid())
    AND game_id IN (
      SELECT id FROM league_games WHERE league_id IN (
        SELECT league_id FROM league_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can change their votes"
  ON league_game_votes FOR UPDATE
  USING (voter_id IN (SELECT id FROM league_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can delete their votes"
  ON league_game_votes FOR DELETE
  USING (voter_id IN (SELECT id FROM league_members WHERE user_id = auth.uid()));

CREATE INDEX idx_league_game_votes_game ON league_game_votes(game_id);
CREATE INDEX idx_league_game_votes_voter ON league_game_votes(voter_id);
