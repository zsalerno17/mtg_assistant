-- League invite links table
CREATE TABLE IF NOT EXISTS league_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ DEFAULT NULL,
    max_uses INT DEFAULT NULL,
    used_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_league_invites_token ON league_invites(token);

-- RLS policies
ALTER TABLE league_invites ENABLE ROW LEVEL SECURITY;

-- Members can view invites for their leagues
CREATE POLICY "Members can view league invites"
    ON league_invites FOR SELECT
    USING (
        league_id IN (
            SELECT league_id FROM league_members WHERE user_id = auth.uid()
        )
    );

-- Only league creators can create invites
CREATE POLICY "Creators can create invites"
    ON league_invites FOR INSERT
    WITH CHECK (
        created_by = auth.uid()
        AND league_id IN (
            SELECT id FROM leagues WHERE created_by = auth.uid()
        )
    );

-- Allow updating used_count for anyone (needed for join flow)
CREATE POLICY "Anyone can increment invite usage"
    ON league_invites FOR UPDATE
    USING (true)
    WITH CHECK (true);
