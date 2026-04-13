-- Migration 017: Fix get_league_standings return type error
-- "structure of query does not match function result type" is caused by a stale
-- cached function signature. DROP + CREATE (instead of CREATE OR REPLACE) forces
-- Postgres to discard the old compiled plan entirely.
-- Also adds explicit ::bigint casts to COALESCE so the return type is unambiguous.

DROP FUNCTION IF EXISTS get_league_standings(UUID);

CREATE FUNCTION get_league_standings(league_uuid UUID)
RETURNS TABLE (
  member_id       UUID,
  superstar_name  TEXT,
  total_points    BIGINT,
  games_played    BIGINT,
  wins            BIGINT,
  first_bloods    BIGINT,
  last_stands     BIGINT,
  entrance_bonuses BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    lm.id                                                          AS member_id,
    lm.superstar_name,
    COALESCE(SUM(lgr.total_points), 0::bigint)                     AS total_points,
    COUNT(lgr.id)                                                  AS games_played,
    COUNT(lgr.id) FILTER (WHERE lgr.earned_win)                    AS wins,
    COUNT(lgr.id) FILTER (WHERE lgr.earned_first_blood)            AS first_bloods,
    COUNT(lgr.id) FILTER (WHERE lgr.earned_last_stand)             AS last_stands,
    COUNT(lgr.id) FILTER (WHERE lgr.earned_entrance_bonus)         AS entrance_bonuses
  FROM league_members lm
  LEFT JOIN league_game_results lgr ON lm.id = lgr.member_id
  LEFT JOIN league_games lg          ON lgr.game_id = lg.id
  WHERE lm.league_id = league_uuid
    AND (lg.league_id = league_uuid OR lg.league_id IS NULL)
  GROUP BY lm.id, lm.superstar_name
  ORDER BY total_points DESC, wins DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_league_standings(UUID) TO authenticated;
