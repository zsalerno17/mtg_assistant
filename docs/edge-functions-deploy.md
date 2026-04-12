# Edge Functions Deployment Guide

## Prerequisites
- Supabase CLI: `npx supabase --version` (or install globally)
- Supabase project linked: `npx supabase link --project-ref <project-ref>`

## 1. Set Edge Function Secrets

In the Supabase Dashboard → Settings → Edge Functions → Secrets, set:

- `GEMINI_API_KEY` — your Google Gemini API key
- `SUPABASE_SERVICE_ROLE_KEY` — your project's service role key (from Settings → API)
- `SUPABASE_ANON_KEY` — your project's anon key
- `SUPABASE_URL` — your project URL (e.g., `https://xxx.supabase.co`)

Or via CLI:
```bash
npx supabase secrets set GEMINI_API_KEY=<key>
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key>
npx supabase secrets set SUPABASE_ANON_KEY=<key>
npx supabase secrets set SUPABASE_URL=<url>
```

## 2. Deploy All Functions

```bash
npx supabase functions deploy
```

This deploys all 7 functions at once:
- `health` — Health check
- `users` — User profile management
- `analyses` — Analysis history
- `collection` — Collection upload/retrieval
- `decks` — Deck fetch/analyze/library
- `ai` — Strategy, improvements, scenarios, collection upgrades
- `leagues` — Full league/pod tracking

## 3. Update Vercel Environment Variables

In Vercel → Project Settings → Environment Variables:

- Ensure `VITE_SUPABASE_URL` is set to your Supabase project URL
- Remove or keep `VITE_API_BASE_URL` (it will be ignored when `VITE_SUPABASE_URL` is set)

The frontend `api.js` automatically routes to Edge Functions when `VITE_SUPABASE_URL` is set.

## 4. Trigger Vercel Redeployment

Push to main or trigger a manual redeploy in Vercel dashboard.

## 5. Smoke Test

1. Login to the app
2. View deck library
3. Add a new deck
4. Run analysis on a deck
5. Get AI strategy advice
6. Upload a collection
7. Create/view a league

## 6. Monitor

Check Edge Function logs in Supabase Dashboard → Edge Functions → Logs.

## 7. Render Teardown (After 1 Week Stable)

After confirming production is stable on Edge Functions:
1. Delete the Render service (Settings → Delete Service)
2. Archive the `backend/` directory reference

## Architecture

```
Frontend (Vercel)
    ↓ HTTPS
Supabase Edge Functions (Deno)
    ↓ Supabase client
PostgreSQL (Supabase)
    ↓ External APIs
Moxfield / Scryfall / Gemini
```

Each Edge Function handles one domain:
- URL pattern: `<SUPABASE_URL>/functions/v1/<function-name>/<path>`
- Auth: Bearer token in Authorization header (same as FastAPI)
- The frontend detects `VITE_SUPABASE_URL` and routes automatically
