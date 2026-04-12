-- Migration 014: Repair league tables
-- Context: Migrations 007-012 were applied but league tables never existed in production
-- because 007 had a forward-reference bug: the leagues SELECT policy referenced
-- league_members before that table was created, causing the full migration to fail.
-- This migration recreates all league tables in the correct order.

-- ============================================================================
-- STEP 1: ALL TABLE DEFINITIONS (no policies yet — avoid forward references)
-- ============================================================================

CREATE TABLE IF NOT EXISTS leagues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(200) NOT NULL,
  description     VARCHAR(5000),
  created_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_start    DATE NOT NULL,
  season_end      DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_season_dates CHECK (season_end > season_start)
);

CREATE TABLE IF NOT EXISTS league_members (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id           UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  superstar_name      VARCHAR(100) NOT NULL,
  entrance_music_url  VARCHAR(2048),
  catchphrase         VARCHAR(500),
  current_title       VARCHAR(100),
  joined_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (league_id, user_id)
);

CREATE TABLE IF NOT EXISTS league_games (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id               UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  game_number             INT NOT NULL,
  played_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  screenshot_url          VARCHAR(2048),
  spicy_play_description  VARCHAR(2000),
  spicy_play_winner_id    UUID REFERENCES league_members(id) ON DELETE SET NULL,
  entrance_winner_id      UUID REFERENCES league_members(id) ON DELETE SET NULL,
  notes                   VARCHAR(2000),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (league_id, game_number)
);

-- Includes 008 additions (earned_second_place, earned_third_place)
-- and 009 constraint (unique_game_placement)
CREATE TABLE IF NOT EXISTS league_game_results (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id               UUID NOT NULL REFERENCES league_games(id) ON DELETE CASCADE,
  member_id             UUID NOT NULL REFERENCES league_members(id) ON DELETE CASCADE,
  deck_id               UUID REFERENCES user_decks(id) ON DELETE SET NULL,
  placement             INT NOT NULL CHECK (placement >= 1),
  earned_win            BOOLEAN NOT NULL DEFAULT false,
  earned_first_blood    BOOLEAN NOT NULL DEFAULT false,
  earned_last_stand     BOOLEAN NOT NULL DEFAULT false,
  earned_entrance_bonus BOOLEAN NOT NULL DEFAULT false,
  earned_second_place   BOOLEAN NOT NULL DEFAULT false,
  earned_third_place    BOOLEAN NOT NULL DEFAULT false,
  total_points          INT NOT NULL DEFAULT 0,
  notes                 VARCHAR(2000),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, member_id),
  CONSTRAINT unique_game_placement UNIQUE (game_id, placement)
);

CREATE TABLE IF NOT EXISTS league_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id   UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  created_by  UUID NOT NULL REFERENCES auth.users(id),
  expires_at  TIMESTAMPTZ DEFAULT NULL,
  max_uses    INT DEFAULT NULL,
  used_count  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS league_game_votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID NOT NULL REFERENCES league_games(id) ON DELETE CASCADE,
  voter_id    UUID NOT NULL REFERENCES league_members(id) ON DELETE CASCADE,
  category    TEXT NOT NULL CHECK (category IN ('entrance', 'spicy_play')),
  nominee_id  UUID NOT NULL REFERENCES league_members(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, voter_id, category)
);

-- ============================================================================
-- STEP 2: ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE leagues             ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_games        ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_invites      ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_game_votes   ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: ALL POLICIES (all tables now exist, no forward references)
-- ============================================================================

-- leagues
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

-- league_members
CREATE POLICY "Users see members in their leagues"
  ON league_members FOR SELECT
  USING (
    league_id IN (SELECT league_id FROM league_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own member profile"
  ON league_members FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can join leagues"
  ON league_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave leagues"
  ON league_members FOR DELETE
  USING (user_id = auth.uid());

-- league_games
CREATE POLICY "Users see games in their leagues"
  ON league_games FOR SELECT
  USING (
    league_id IN (SELECT league_id FROM league_members WHERE user_id = auth.uid())
  );

CREATE POLICY "League members can log games"
  ON league_games FOR INSERT
  WITH CHECK (
    league_id IN (SELECT league_id FROM league_members WHERE user_id = auth.uid())
  );

CREATE POLICY "League members can update games"
  ON league_games FOR UPDATE
  USING (
    league_id IN (SELECT league_id FROM league_members WHERE user_id = auth.uid())
  );

CREATE POLICY "League members can delete games"
  ON league_games FOR DELETE
  USING (
    league_id IN (SELECT league_id FROM league_members WHERE user_id = auth.uid())
  );

-- league_game_results
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

CREATE POLICY "League members can update results"
  ON league_game_results FOR UPDATE
  USING (
    game_id IN (
      SELECT id FROM league_games WHERE league_id IN (
        SELECT league_id FROM league_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "League members can delete results"
  ON league_game_results FOR DELETE
  USING (
    game_id IN (
      SELECT id FROM league_games WHERE league_id IN (
        SELECT league_id FROM league_members WHERE user_id = auth.uid()
      )
    )
  );

-- league_invites
CREATE POLICY "Members can view league invites"
  ON league_invites FOR SELECT
  USING (
    league_id IN (SELECT league_id FROM league_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Creators can create invites"
  ON league_invites FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND league_id IN (SELECT id FROM leagues WHERE created_by = auth.uid())
  );

CREATE POLICY "Anyone can increment invite usage"
  ON league_invites FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- league_game_votes
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

-- ============================================================================
-- STEP 4: INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_league_members_league             ON league_members(league_id);
CREATE INDEX IF NOT EXISTS idx_league_members_user               ON league_members(user_id);
CREATE INDEX IF NOT EXISTS idx_league_games_league               ON league_games(league_id);
CREATE INDEX IF NOT EXISTS idx_league_game_results_game          ON league_game_results(game_id);
CREATE INDEX IF NOT EXISTS idx_league_game_results_member        ON league_game_results(member_id);
CREATE INDEX IF NOT EXISTS idx_league_game_results_deck          ON league_game_results(deck_id) WHERE deck_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_league_game_results_member_points ON league_game_results(member_id, total_points DESC);
CREATE INDEX IF NOT EXISTS idx_leagues_created_by                ON leagues(created_by);
CREATE INDEX IF NOT EXISTS idx_league_invites_token              ON league_invites(token);
CREATE INDEX IF NOT EXISTS idx_league_game_votes_game            ON league_game_votes(game_id);
CREATE INDEX IF NOT EXISTS idx_league_game_votes_voter           ON league_game_votes(voter_id);

-- ============================================================================
-- STEP 5: STANDINGS FUNCTION (fixed version from migration 008)
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
  LEFT JOIN league_games lg ON lgr.game_id = lg.id
  WHERE lm.league_id = league_uuid
    AND (lg.league_id = league_uuid OR lg.league_id IS NULL)
  GROUP BY lm.id, lm.superstar_name
  ORDER BY total_points DESC, wins DESC;
END;
$$ LANGUAGE plpgsql STABLE;
