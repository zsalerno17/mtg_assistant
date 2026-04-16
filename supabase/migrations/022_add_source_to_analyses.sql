-- Add source column to analyses to track which platform a deck came from.
-- Existing rows default to 'moxfield'.
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'moxfield';
