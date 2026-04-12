-- Add commander artwork and format to user decks
-- This enables the table to display commander art thumbnails without joining the decks table
ALTER TABLE user_decks
  ADD COLUMN commander_image_uri TEXT,
  ADD COLUMN partner_image_uri TEXT,
  ADD COLUMN format TEXT DEFAULT 'commander';
