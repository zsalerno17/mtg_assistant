-- Migration 023: Make league season dates optional
-- Context: Victory conditions other than "time_period" (points threshold, skirmish count)
-- don't require season start/end dates. Make them nullable so campaigns can be created
-- without dates when a different victory condition is selected.

-- Drop the NOT NULL constraints and the check constraint
ALTER TABLE leagues
  ALTER COLUMN season_start DROP NOT NULL,
  ALTER COLUMN season_end   DROP NOT NULL;

-- Replace the date ordering constraint to allow NULLs
ALTER TABLE leagues DROP CONSTRAINT IF EXISTS check_season_dates;
ALTER TABLE leagues ADD CONSTRAINT check_season_dates
  CHECK (season_end IS NULL OR season_start IS NULL OR season_end > season_start);
