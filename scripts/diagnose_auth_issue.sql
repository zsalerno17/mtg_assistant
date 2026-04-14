-- Diagnostic Script for Authorization Issue
-- Run this in: Supabase Dashboard → SQL Editor
-- =========================================================

-- 1. Check all emails in allowed_users table
-- Look for any mixed-case emails (is_lowercase = false indicates case issue)
SELECT 
  email,
  LOWER(email) as normalized_email,
  email = LOWER(email) as is_lowercase,
  CASE 
    WHEN email = LOWER(email) THEN '✓ OK'
    ELSE '✗ CASE MISMATCH - will cause 403'
  END as status
FROM allowed_users 
ORDER BY email;

-- 2. Check actual user emails from auth.users
-- This shows what email OAuth providers are returning
SELECT 
  id,
  email,
  LOWER(email) as normalized_email,
  email = LOWER(email) as is_lowercase,
  created_at,
  last_sign_in_at
FROM auth.users 
ORDER BY created_at DESC
LIMIT 20;

-- 3. Cross-check: Find users who are in auth.users but will fail authorization
-- These are users who can sign in but get 403 errors
SELECT 
  au.id as user_id,
  au.email as auth_email,
  LOWER(au.email) as auth_email_normalized,
  aw.email as allowlist_email,
  CASE 
    WHEN aw.email IS NULL THEN '✗ NOT IN ALLOWLIST'
    WHEN au.email = aw.email THEN '✓ EXACT MATCH - OK'
    WHEN LOWER(au.email) = LOWER(aw.email) THEN '⚠ CASE MISMATCH - WILL FAIL'
    ELSE '? UNKNOWN STATUS'
  END as status
FROM auth.users au
LEFT JOIN allowed_users aw ON LOWER(au.email) = LOWER(aw.email)
ORDER BY au.created_at DESC
LIMIT 20;

-- 4. Show recommended fixes
-- If query #3 shows any "CASE MISMATCH" entries, these users need fixing
SELECT 
  aw.email as current_allowlist_entry,
  LOWER(aw.email) as recommended_fix,
  aw.email != LOWER(aw.email) as needs_update
FROM allowed_users aw
WHERE aw.email != LOWER(aw.email);
