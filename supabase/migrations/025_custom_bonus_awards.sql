-- Add custom_bonus_winners JSONB column to league_games to support user-defined bonus awards.
-- Stores a map of { award_id: member_id } for each custom award winner per game.
ALTER TABLE league_games
  ADD COLUMN IF NOT EXISTS custom_bonus_winners JSONB NOT NULL DEFAULT '{}'::jsonb;
