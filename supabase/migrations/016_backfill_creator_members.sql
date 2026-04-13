-- Migration 016: Backfill missing league_members rows for league creators
-- Context: createLeague() did not auto-insert the creator into league_members
-- before migration 015 was applied. This leaves orphaned leagues that the
-- creator cannot see because listLeagues() inner-joins on league_members.

INSERT INTO league_members (league_id, user_id, superstar_name)
SELECT
  l.id                                                          AS league_id,
  l.created_by                                                  AS user_id,
  COALESCE(NULLIF(TRIM(up.username), ''), 'Creator')           AS superstar_name
FROM leagues l
LEFT JOIN user_profiles up ON up.user_id = l.created_by
WHERE NOT EXISTS (
  SELECT 1 FROM league_members lm
  WHERE lm.league_id = l.id
    AND lm.user_id   = l.created_by
);
