-- Normalize allowed_users email to lowercase for case-insensitive auth
-- ========================================================================
-- Context: OAuth providers (Google, etc.) return emails in lowercase,
-- but allowed_users table had mixed-case entries causing 403 errors.
-- This migration normalizes all emails to lowercase and adds a constraint
-- to prevent future case-sensitivity issues.

-- 1. Convert all existing emails to lowercase
UPDATE allowed_users 
SET email = LOWER(email)
WHERE email != LOWER(email);

-- 2. Add constraint to enforce lowercase emails going forward
ALTER TABLE allowed_users
ADD CONSTRAINT email_lowercase CHECK (email = LOWER(email));

-- 3. Add documentation comment
COMMENT ON TABLE allowed_users IS 'Admin-managed allow-list. Emails must be lowercase for case-insensitive OAuth compatibility.';

-- Verification query (run manually to confirm):
-- SELECT email, email = LOWER(email) as is_lowercase FROM allowed_users;
