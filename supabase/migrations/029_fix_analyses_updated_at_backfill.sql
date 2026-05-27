-- Fix: Properly backfill updated_at to match created_at for historical analyses
-- The previous migration set all rows to the current timestamp when the column was added.
-- This resets them to their original created_at values to preserve analysis history.

UPDATE analyses
  SET updated_at = created_at
  WHERE updated_at > created_at;  -- Only update rows where updated_at was set to "now()" during migration
