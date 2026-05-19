-- Fix: Allow users to update their own analyses
-- Root cause: UPDATE RLS policy was missing, causing fresh analysis results to 
-- calculate new power levels but fail to save them to the database.
-- This created a discrepancy where dashboard (reads from DB) shows old values
-- while deck page (uses fresh API response) shows new values.

CREATE POLICY "Users can update own analyses"
  ON analyses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
