-- Migration 015: Fix infinite recursion in league_members RLS
-- Problem: The SELECT policy "Users see members in their leagues" on league_members
-- queries league_members itself:
--
--   USING (
--     league_id IN (SELECT league_id FROM league_members WHERE user_id = auth.uid())
--   )
--
-- When Postgres evaluates this policy for a row in league_members, it runs the
-- subquery — which queries league_members again — re-triggering the same policy
-- → infinite recursion → error: "infinite recursion detected in policy for
-- relation league_members".
--
-- Cascading effect: every other table with a policy that subqueries league_members
-- (leagues, league_games, league_game_results, league_invites, league_game_votes)
-- also hits the same recursion because their subqueries on league_members trigger
-- the broken policy.
--
-- Fix: Create a SECURITY DEFINER function that bypasses RLS when doing the inner
-- lookup, then rewrite the league_members SELECT policy to call that function.
-- This is the standard Supabase pattern for self-referencing membership tables.
-- Once the league_members policy no longer recurses, all downstream policies on
-- other tables resolve safely because their subqueries on league_members will
-- evaluate the (now non-recursive) policy cleanly.

-- ============================================================================
-- STEP 1: Create a security-definer helper function
-- Runs as the DB owner (SECURITY DEFINER), so it queries league_members directly
-- without triggering any RLS policies. The search_path is pinned to public to
-- prevent search_path injection attacks.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_my_league_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT league_id FROM league_members WHERE user_id = auth.uid();
$$;

-- Allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION get_my_league_ids() TO authenticated;

-- ============================================================================
-- STEP 2: Drop the recursive policy and replace it with the fixed version
-- ============================================================================

DROP POLICY IF EXISTS "Users see members in their leagues" ON league_members;

CREATE POLICY "Users see members in their leagues"
  ON league_members FOR SELECT
  USING (
    league_id IN (SELECT get_my_league_ids())
  );
