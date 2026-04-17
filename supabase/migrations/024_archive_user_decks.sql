-- Add archived_at to user_decks for soft-delete support.
-- Archived decks are hidden from the library and deck pickers
-- but their rows remain so league/personal game history stays intact.

ALTER TABLE user_decks
  ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL;

-- Index to make filtering unarchived decks cheap.
CREATE INDEX idx_user_decks_active ON user_decks (user_id, added_at DESC)
  WHERE archived_at IS NULL;
