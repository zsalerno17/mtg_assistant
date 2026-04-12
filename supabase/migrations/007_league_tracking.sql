-- League/Pod tracking for Commander Gauntlet and similar weekly play groups
-- Tracks seasons, members, games, and individual game results with flexible scoring

-- ============================================================================
-- LEAGUES: Season-based competition (e.g., "Commander Gauntlet Spring 2026")
-- ============================================================================
CREATE TABLE IF NOT EXISTS leagues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT, -- Full rules markdown
  created_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_start    DATE NOT NULL,
  season_end      DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see leagues they're in"
  ON leagues FOR SELECT
  USING (
    id IN (SELECT league_id FROM league_members WHERE user_id = auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY "League creators can update their leagues"
  ON leagues FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Anyone can create leagues"
  ON leagues FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- ============================================================================
-- LEAGUE MEMBERS: Player profiles within a league (superstar names, entrance music, titles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS league_members (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id           UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  superstar_name      TEXT NOT NULL,
  entrance_music_url  TEXT,
  catchphrase         TEXT,
  current_title       TEXT, -- "The Betrayer", "Comeback Kid", etc.
  joined_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (league_id, user_id)
);

ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see members in their leagues"
  ON league_members FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own member profile"
  ON league_members FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can join leagues"
  ON league_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- LEAGUE GAMES: Individual game sessions (weekly play, metadata, special awards)
-- ============================================================================
CREATE TABLE IF NOT EXISTS league_games (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id               UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  game_number             INT NOT NULL, -- Week 1, Week 2, etc.
  played_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  screenshot_url          TEXT, -- Board state screenshot
  spicy_play_description  TEXT, -- Description of "Spicy Play of the Week"
  spicy_play_winner_id    UUID REFERENCES league_members(id) ON DELETE SET NULL,
  entrance_winner_id      UUID REFERENCES league_members(id) ON DELETE SET NULL, -- WWE entrance bonus
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (league_id, game_number)
);

ALTER TABLE league_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see games in their leagues"
  ON league_games FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "League members can log games"
  ON league_games FOR INSERT
  WITH CHECK (
    league_id IN (
      SELECT league_id FROM league_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "League members can update games"
  ON league_games FOR UPDATE
  USING (
    league_id IN (
      SELECT league_id FROM league_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- LEAGUE GAME RESULTS: Per-player results for each game (placement, points)
-- ============================================================================
CREATE TABLE IF NOT EXISTS league_game_results (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id               UUID NOT NULL REFERENCES league_games(id) ON DELETE CASCADE,
  member_id             UUID NOT NULL REFERENCES league_members(id) ON DELETE CASCADE,
  deck_id               UUID REFERENCES user_decks(id) ON DELETE SET NULL, -- Which deck they played
  placement             INT NOT NULL CHECK (placement >= 1), -- 1 = winner, 4 = first eliminated
  earned_win            BOOLEAN NOT NULL DEFAULT false, -- 3 pts
  earned_first_blood    BOOLEAN NOT NULL DEFAULT false, -- 1 pt (first elimination)
  earned_last_stand     BOOLEAN NOT NULL DEFAULT false, -- 1 pt (last eliminated)
  earned_entrance_bonus BOOLEAN NOT NULL DEFAULT false, -- 1 pt (WWE entrance)
  total_points          INT NOT NULL DEFAULT 0, -- Calculated sum
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, member_id)
);

ALTER TABLE league_game_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see results in their leagues"
  ON league_game_results FOR SELECT
  USING (
    game_id IN (
      SELECT id FROM league_games WHERE league_id IN (
        SELECT league_id FROM league_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "League members can insert results"
  ON league_game_results FOR INSERT
  WITH CHECK (
    game_id IN (
      SELECT id FROM league_games WHERE league_id IN (
        SELECT league_id FROM league_members WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- INDEXES for performance
-- ============================================================================
CREATE INDEX idx_league_members_league ON league_members(league_id);
CREATE INDEX idx_league_members_user ON league_members(user_id);
CREATE INDEX idx_league_games_league ON league_games(league_id);
CREATE INDEX idx_league_game_results_game ON league_game_results(game_id);
CREATE INDEX idx_league_game_results_member ON league_game_results(member_id);

-- ============================================================================
-- HELPER FUNCTION: Calculate standings for a league
-- ============================================================================
CREATE OR REPLACE FUNCTION get_league_standings(league_uuid UUID)
RETURNS TABLE (
  member_id UUID,
  superstar_name TEXT,
  total_points BIGINT,
  games_played BIGINT,
  wins BIGINT,
  first_bloods BIGINT,
  last_stands BIGINT,
  entrance_bonuses BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lm.id AS member_id,
    lm.superstar_name,
    COALESCE(SUM(lgr.total_points), 0) AS total_points,
    COUNT(lgr.id) AS games_played,
    COUNT(lgr.id) FILTER (WHERE lgr.earned_win) AS wins,
    COUNT(lgr.id) FILTER (WHERE lgr.earned_first_blood) AS first_bloods,
    COUNT(lgr.id) FILTER (WHERE lgr.earned_last_stand) AS last_stands,
    COUNT(lgr.id) FILTER (WHERE lgr.earned_entrance_bonus) AS entrance_bonuses
  FROM league_members lm
  LEFT JOIN league_game_results lgr ON lm.id = lgr.member_id
  WHERE lm.league_id = league_uuid
  GROUP BY lm.id, lm.superstar_name
  ORDER BY total_points DESC, wins DESC; -- Tiebreaker: most wins
END;
$$ LANGUAGE plpgsql STABLE;
