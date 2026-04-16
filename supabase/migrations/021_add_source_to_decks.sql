-- Add source column to decks and user_decks to support multiple import platforms.
-- Existing rows default to 'moxfield'. New platforms (e.g. 'archidekt') use their
-- platform name. IDs across platforms don't collide so no UNIQUE constraint changes needed.

ALTER TABLE decks ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'moxfield';
ALTER TABLE user_decks ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'moxfield';
