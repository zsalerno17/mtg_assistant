-- Add deck metadata columns to analyses table
ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS deck_name TEXT,
  ADD COLUMN IF NOT EXISTS moxfield_url TEXT,
  ADD COLUMN IF NOT EXISTS deck_updated_at TEXT;

-- Unique constraint to enable dedup logic (user can only have one analysis per deck)
-- Drop duplicates first (keep most recent), then add constraint
DELETE FROM analyses a
  USING analyses b
  WHERE a.user_id = b.user_id
    AND a.deck_id = b.deck_id
    AND a.created_at < b.created_at;

ALTER TABLE analyses
  ADD CONSTRAINT analyses_user_deck_unique UNIQUE (user_id, deck_id);
