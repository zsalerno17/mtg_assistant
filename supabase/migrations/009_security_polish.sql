-- Migration 009: Security Polish — DB-level constraints
-- Phase 27: Text field length limits, date validation, placement uniqueness
-- Date: April 12, 2026

-- ============================================================================
-- PART 1: Text field length constraints
-- ============================================================================

-- League name/description limits
ALTER TABLE leagues
  ALTER COLUMN name TYPE VARCHAR(200),
  ALTER COLUMN description TYPE VARCHAR(5000);

-- Member profile field limits
ALTER TABLE league_members
  ALTER COLUMN superstar_name TYPE VARCHAR(100),
  ALTER COLUMN catchphrase TYPE VARCHAR(500),
  ALTER COLUMN current_title TYPE VARCHAR(100),
  ALTER COLUMN entrance_music_url TYPE VARCHAR(2048);

-- Game field limits
ALTER TABLE league_games
  ALTER COLUMN spicy_play_description TYPE VARCHAR(2000),
  ALTER COLUMN notes TYPE VARCHAR(2000),
  ALTER COLUMN screenshot_url TYPE VARCHAR(2048);

-- Result notes limit
ALTER TABLE league_game_results
  ALTER COLUMN notes TYPE VARCHAR(2000);

-- ============================================================================
-- PART 2: Date range constraint (season_end > season_start)
-- ============================================================================

ALTER TABLE leagues
  ADD CONSTRAINT check_season_dates CHECK (season_end > season_start);

-- ============================================================================
-- PART 3: Placement uniqueness constraint (each player gets unique placement per game)
-- ============================================================================

ALTER TABLE league_game_results
  ADD CONSTRAINT unique_game_placement UNIQUE (game_id, placement);
