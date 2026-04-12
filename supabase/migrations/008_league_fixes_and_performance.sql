-- Migration 008: League Tracking Fixes & Performance Improvements
-- Fixes: (1) Broken standings SQL bug, (2) New scoring system, (3) Performance indexes
-- Date: April 12, 2026

-- ============================================================================
-- PART 1: Add new scoring fields for fixed placement-based system
-- ============================================================================

-- Add new scoring columns (3-2-1-0 placement system + entrance bonus)
ALTER TABLE league_game_results 
ADD COLUMN IF NOT EXISTS earned_second_place BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS earned_third_place BOOLEAN NOT NULL DEFAULT false;

-- Deprecate old fields but keep for backward compatibility
COMMENT ON COLUMN league_game_results.earned_first_blood IS 'DEPRECATED: No longer used in scoring. Kept for data migration.';
COMMENT ON COLUMN league_game_results.earned_last_stand IS 'DEPRECATED: No longer used in scoring. Kept for data migration.';

-- ============================================================================
-- PART 2: Fix CRITICAL BUG in get_league_standings() — was including all leagues
-- ============================================================================

-- Original bug: JOIN without league_id filter in WHERE clause
-- Resulted in standings showing results from ALL leagues a member is in
CREATE OR REPLACE FUNCTION get_league_standings(league_uuid UUID)
RETURNS TABLE (
  member_id UUID,
  superstar_name TEXT,
  total_points BIGINT,
  games_played BIGINT,
  wins BIGINT,
  first_bloods BIGINT,  -- Deprecated but kept for compatibility
  last_stands BIGINT,   -- Deprecated but kept for compatibility
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
  LEFT JOIN league_games lg ON lgr.game_id = lg.id  -- FIX: Add game join to filter by league
  WHERE lm.league_id = league_uuid
    AND (lg.league_id = league_uuid OR lg.league_id IS NULL)  -- FIX: Only count games from THIS league
  GROUP BY lm.id, lm.superstar_name
  ORDER BY total_points DESC, wins DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- PART 3: Performance Indexes (identified in performance audit)
-- ============================================================================

-- Index for deck filtering queries
CREATE INDEX IF NOT EXISTS idx_league_game_results_deck 
  ON league_game_results(deck_id) 
  WHERE deck_id IS NOT NULL;

-- Index for league creator lookups
CREATE INDEX IF NOT EXISTS idx_leagues_created_by 
  ON leagues(created_by);

-- Remove redundant index (covered by UNIQUE constraint on game_number)
-- NOTE: Commented out — verify UNIQUE constraint exists first
-- DROP INDEX IF EXISTS idx_league_games_league;

-- ============================================================================
-- PART 4: Add unique constraint for placement validation
-- ============================================================================

-- Prevent duplicate placements in a game (backend validates, DB enforces)
-- NOTE: This may fail if existing data has duplicates — clean data first
-- Commented out for now, uncomment after data validation:
-- ALTER TABLE league_game_results
-- ADD CONSTRAINT unique_game_placement UNIQUE (game_id, placement);

-- ============================================================================
-- PART 5: Add missing RLS policies (security audit findings)
-- ============================================================================

-- Allow users to leave leagues (delete their own membership)
CREATE POLICY "Users can leave leagues"
  ON league_members FOR DELETE
  USING (user_id = auth.uid());

-- League members can update/delete games (only in leagues they're in)
CREATE POLICY "League members can update games"
  ON league_games FOR UPDATE
  USING (
    league_id IN (
      SELECT league_id FROM league_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "League members can delete games"
  ON league_games FOR DELETE
  USING (
    league_id IN (
      SELECT league_id FROM league_members WHERE user_id = auth.uid()
    )
  );

-- League members can update/delete results (for fixing mistakes)
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

-- ============================================================================
-- PART 6: Update total_points for existing games (data migration)
-- ============================================================================

-- Recalculate points for all existing results using new system
-- Only run if there's existing data to migrate
-- Commented out by default — uncomment after reviewing data:
/*
UPDATE league_game_results
SET 
  total_points = CASE
    WHEN earned_win THEN 3  -- 1st place
    WHEN placement = 2 THEN 2  -- 2nd place
    WHEN placement = 3 THEN 1  -- 3rd place
    ELSE 0  -- 4th+ place
  END + CASE WHEN earned_entrance_bonus THEN 1 ELSE 0 END,
  earned_second_place = (placement = 2),
  earned_third_place = (placement = 3),
  earned_first_blood = false,  -- Deprecated
  earned_last_stand = false    -- Deprecated
WHERE total_points IS NOT NULL;  -- Only update existing records
*/

-- ============================================================================
-- VERIFICATION QUERIES (run in Supabase SQL editor after migration)
-- ============================================================================

-- 1. Verify standings calculation is scoped to single league
--    Should return 0 rows (no cross-league contamination):
/*
SELECT DISTINCT lgr.game_id, lg.league_id, lm.league_id
FROM league_game_results lgr
JOIN league_games lg ON lgr.game_id = lg.id
JOIN league_members lm ON lgr.member_id = lm.id
WHERE lg.league_id != lm.league_id;
*/

-- 2. Verify new indexes exist:
/*
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('league_game_results', 'leagues') 
ORDER BY tablename, indexname;
*/

-- 3. Verify RLS policies:
/*
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename LIKE 'league%' 
ORDER BY tablename, policyname;
*/
