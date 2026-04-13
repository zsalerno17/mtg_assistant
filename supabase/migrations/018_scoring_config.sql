-- Migration 018: Add scoring_config to leagues
-- Allows each league to configure which bonus awards are tracked per game.
-- Default: all awards enabled for backwards compatibility.

ALTER TABLE leagues
  ADD COLUMN IF NOT EXISTS scoring_config JSONB NOT NULL
  DEFAULT '{"first_blood": true, "entrance_bonus": true, "spicy_play": true}'::jsonb;
