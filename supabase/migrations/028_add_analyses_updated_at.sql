-- Add updated_at column to analyses table to track when analysis was last modified
-- This fixes the dashboard status column showing stale dates after re-analysis

-- Add the column with default to now()
ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill existing rows: set updated_at = created_at for historical data
UPDATE analyses
  SET updated_at = created_at
  WHERE updated_at IS NULL OR updated_at = created_at;

-- Create a function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at on every UPDATE
DROP TRIGGER IF EXISTS analyses_updated_at_trigger ON analyses;
CREATE TRIGGER analyses_updated_at_trigger
  BEFORE UPDATE ON analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_analyses_updated_at();

-- Create index for common query pattern (user_id + updated_at DESC for recent analyses)
CREATE INDEX IF NOT EXISTS analyses_user_updated_idx ON analyses (user_id, updated_at DESC);
