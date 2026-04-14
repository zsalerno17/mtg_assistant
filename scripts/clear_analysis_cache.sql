-- Clear all cached deck analyses to force regeneration with new chart data
-- Run this in Supabase SQL Editor after deploying new analysis fields

DELETE FROM analyses;

-- Verify
SELECT COUNT(*) as remaining_cached_analyses FROM analyses;
