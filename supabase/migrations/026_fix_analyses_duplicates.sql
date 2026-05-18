-- Fix duplicate analyses issue
-- The original unique constraint was (user_id, deck_id) but didn't include source.
-- This could allow duplicates when source column was added later.

-- First, drop the old constraint
ALTER TABLE analyses DROP CONSTRAINT IF EXISTS analyses_user_deck_unique;

-- Delete duplicate analyses, keeping only the most recent for each (user_id, deck_id, source) combo
DELETE FROM analyses a
USING analyses b
WHERE a.user_id = b.user_id
  AND a.deck_id = b.deck_id
  AND a.source = b.source
  AND a.created_at < b.created_at;

-- Add new unique constraint that includes source
ALTER TABLE analyses
  ADD CONSTRAINT analyses_user_deck_source_unique UNIQUE (user_id, deck_id, source);

-- Create index for faster lookups (the query pattern we use)
CREATE INDEX IF NOT EXISTS analyses_user_deck_source_created_idx 
  ON analyses (user_id, deck_id, source, created_at DESC);
