-- Add color_identity column to user_decks to support league color pip display
-- Stores commander color identity (e.g., ["W", "U", "B"] for Esper)

ALTER TABLE user_decks
ADD COLUMN IF NOT EXISTS color_identity TEXT[] DEFAULT '{}';

-- Add index for faster filtering by color
CREATE INDEX IF NOT EXISTS idx_user_decks_color_identity ON user_decks USING GIN (color_identity);

-- Add comment for documentation
COMMENT ON COLUMN user_decks.color_identity IS 'Commander color identity from Moxfield API (W/U/B/R/G)';
