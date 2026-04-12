-- Migration 010: Performance Optimizations
-- Phase 28: Composite index for standings, materialized view (optional at scale)
-- Date: April 12, 2026

-- Composite index for faster standings queries at scale (200+ games)
CREATE INDEX IF NOT EXISTS idx_league_game_results_member_points
  ON league_game_results(member_id, total_points DESC);
