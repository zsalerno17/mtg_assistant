# MTG Assistant — Deployment Guide

> **Phase 22 Implementation**  
> Complete deployment guide for Render (backend) + Vercel (frontend)

---

## Prerequisites

- [x] GitHub account
- [x] Render account (free tier)
- [x] Vercel account (free tier)
- [x] Supabase project (already configured)
- [x] Gemini API key (already have)

---

## Step 1: Push to GitHub

**Create new GitHub repository:**

```bash
cd /Users/zacksalerno/Documents/Coding_Projects/mtg-assistant/mtg_assistant
git init
git add .
git commit -m "Initial commit: MTG Assistant with Phases 1-21 complete"

# Create repo on GitHub.com, then:
git remote add origin https://github.com/YOUR_USERNAME/mtg-assistant.git
git branch -M main
git push -u origin main
```

**Recommended `.gitignore` additions** (if not already present):

```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
.venv/
venv/
ENV/
env/

# Node
node_modules/
dist/
.DS_Store

# Environment
.env
.env.local
*.log

# IDE
.vscode/
.idea/
```

---

## Step 2: Deploy Backend to Render

**2.1 — Create New Web Service**

> **Note**: This repo includes a `render.yaml` configuration file that automates all build settings. Render will auto-detect it!

1. Go to [render.com/dashboard](https://render.com/dashboard)
2. Click **New +** → **Web Service**
3. Connect GitHub repository
4. Select `mtg-assistant` repo
5. Render will **auto-detect** `render.yaml` and pre-fill:
   - **Name**: `mtg-assistant-backend`
   - **Region**: Oregon (US West)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: Python 3.11
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free
6. Confirm the auto-detected settings look correct

**2.2 — Set Environment Variables**

Add these in Render dashboard → Environment:

```
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_JWT_SECRET=your_jwt_secret_here
GEMINI_API_KEY=your_gemini_api_key_here
ENVIRONMENT=production
```

**Where to find Supabase values:**
- Go to Supabase dashboard → Project Settings → API
- `SUPABASE_URL`: Project URL
- `SUPABASE_ANON_KEY`: `anon` `public` key
- `SUPABASE_JWT_SECRET`: JWT Secret (under JWT Settings)

**2.3 — Deploy**

Click **Create Web Service**. Render will:
- Clone the repo
- Install dependencies from `backend/requirements.txt`
- Start uvicorn on `$PORT` (dynamically assigned)
- Give you a URL: `https://mtg-assistant-backend.onrender.com` (or similar)

**Note**: Free tier sleeps after 15 minutes of inactivity. First request after sleep takes ~30 seconds to wake up.

**2.4 — Update Backend CORS (Optional)**

After deployment, note your Render backend URL. You'll need it for frontend env vars.

> **Note**: `backend/main.py` already includes `https://*.vercel.app` in CORS allowed origins, so your Vercel frontend will work automatically with the wildcard. This step is optional for additional security.

If you want to restrict CORS to your specific Vercel URL (better security), update `backend/main.py` after you get your Vercel URL (from Step 3):

```python
# backend/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://your-app.vercel.app",  # ← Add your specific Vercel URL here
        # Remove or keep the wildcard based on your security preferences
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Push this change to GitHub → Render will auto-redeploy.

---

## Step 3: Deploy Frontend to Vercel

**3.1 — Import Project**

> **Note**: This repo includes a `vercel.json` configuration file that automates frontend build settings!

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **Add New...** → **Project**
3. Import your `mtg-assistant` GitHub repo
4. Vercel will **auto-detect** `vercel.json` and pre-fill:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/dist`
5. Confirm the auto-detected settings look correct

**3.2 — Set Environment Variables**

Add these in Vercel dashboard → Settings → Environment Variables:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_API_BASE_URL=https://mtg-assistant-backend.onrender.com
```

**Important**: `VITE_API_BASE_URL` must be your Render backend URL from Step 2 (no trailing slash).

**3.3 — Deploy**

Click **Deploy**. Vercel will:
- Install `npm` dependencies
- Run `npm run build`
- Deploy the `dist/` folder to CDN
- Give you a production URL: `https://your-app.vercel.app`

**Note**: Vercel auto-deploys on every `git push` to `main`. Free tier includes unlimited bandwidth and automatic HTTPS.

---

## Step 4: Configure Supabase Auth

**4.1 — Add Vercel URL to Redirect URLs**

1. Go to Supabase dashboard → Authentication → URL Configuration
2. Under **Redirect URLs**, add:
   ```
   https://your-app.vercel.app/auth/callback
   ```
3. Save

**Why**: After Google OAuth login, Supabase redirects to this URL. Without it, login will fail in production.

**4.2 — Test OAuth Flow**

1. Open your Vercel URL: `https://your-app.vercel.app`
2. Click **Sign in with Google**
3. Should redirect to Google → approve → redirect back to your app
4. Check browser DevTools Console for any errors

---

## Step 5: Verification Checklist

**Automated Testing:**

Run the deployment test script to verify backend and frontend are working:

```bash
./scripts/test-deployment.sh \
  https://your-backend.onrender.com \
  https://your-app.vercel.app
```

This will test:
- ✅ Backend health endpoint
- ✅ Backend CORS configuration
- ✅ Frontend accessibility
- ✅ Frontend Vite build verification

**Manual Testing:**

Test these flows in production (on your Vercel URL):

- [ ] **Auth**: Sign in with Google → Dashboard loads
- [ ] **Profile**: Navigate to Profile page → username + avatar show correctly
- [ ] **Deck Import**: Paste Moxfield URL → Deck analysis loads
- [ ] **Collection Upload**: Upload CSV → Shows loading messages → Collection count updates
- [ ] **Collection Upgrades**: Navigate to deck → Collection Upgrades tab → Shows suggestions
- [ ] **Card Tooltips**: Hover over card names in Improvements/Upgrades tabs → Scryfall image appears
- [ ] **StatBadges**: Overview tab → Radial progress rings render correctly with appropriate colors
- [ ] **Scenarios**: Run a scenario → AI or rule-based fallback renders

**Common issues:**

- **401 Unauthorized**: Check if `allowed_users` table in Supabase includes your Google email
- **CORS errors**: Verify Render backend CORS includes your Vercel URL
- **Env var not found**: Rebuild/redeploy on Vercel after adding env vars (Settings → Deployments → click `...` → Redeploy)
- **Backend slow on first request**: Expected — Render free tier wakes from sleep (~30s)

---

## Step 6: Post-Deployment

**6.1 — Update README**

Add production URL to `README.md`:

```markdown
## Live Demo

🚀 **Production**: [https://your-app.vercel.app](https://your-app.vercel.app)

Backend: Render free tier (may sleep after 15 min inactivity)  
Frontend: Vercel (always instant)
```

**6.2 — Monitor Logs**

- **Render logs**: Dashboard → your service → Logs tab (real-time)
- **Vercel logs**: Dashboard → your project → Deployments → click any deployment → Functions tab (serverless logs, though this app doesn't use Vercel Functions)
- **Supabase logs**: Dashboard → Logs Explorer (SQL queries, auth events)

**6.3 — Custom Domain (Optional)**

- **Vercel**: Settings → Domains → Add your domain (free SSL included)
- **Render**: Settings → Custom Domains → Add your domain (free SSL included)

Update Supabase redirect URLs and CORS accordingly.

---

## Rollback Procedure

If production breaks:

**Vercel:**
1. Dashboard → Deployments
2. Find last known working deployment
3. Click `...` → **Promote to Production**

**Render:**
1. Dashboard → your service
2. Deployments tab → find last working commit
3. Click **Redeploy** on that commit

Or: `git revert <bad-commit-hash>` → `git push` → auto-redeploys on both platforms.

---

## Cost Estimate

| Service | Plan | Cost |
|---------|------|------|
| Render (backend) | Free tier | $0/month (sleeps after 15 min) |
| Vercel (frontend) | Hobby | $0/month (100GB bandwidth, unlimited requests) |
| Supabase | Free tier | $0/month (500MB DB, 50k auth users, 2GB bandwidth) |
| Gemini API | Free tier | $0/month (15 req/min) |
| **Total** | | **$0/month** |

**Paid tier upgrades** (if needed):
- Render: $7/month (no sleep, better CPU)
- Vercel: $20/month (teams, analytics)
- Supabase: $25/month (8GB DB, better performance)

**None required** for personal use with <100 daily users.

---

## Troubleshooting

**Backend logs show "Connection refused" or "Name or service not known":**
- Check Supabase URL is correct in Render env vars
- Verify Supabase project is not paused (free tier pauses after 7 days inactivity)

**Frontend shows blank page:**
- Open DevTools Console → check for errors
- Verify `VITE_API_BASE_URL` points to Render backend (not `localhost`)
- Rebuild: Vercel → Settings → Environment Variables → (after changes) → Deployments → Redeploy

**"Too many requests" from Gemini:**
- Free tier: 15 req/min. Rule-based fallbacks should handle this gracefully.
- Check backend logs for `ai_enhanced: false` responses (fallback working correctly)
- Consider upgrading to Gemini paid tier if needed

**Render backend shows "Application failed to respond":**
- Check logs for Python import errors
- Verify `requirements.txt` includes all dependencies
- Try manual deploy: Dashboard → Manual Deploy → Deploy latest commit

---

## Next Steps

After successful deployment:

- [ ] Share production URL with friends for testing
- [ ] Set up monitoring (Sentry, LogRocket, or similar)
- [ ] Consider migrating Supabase to paid tier if database grows >500MB
- [ ] Set up GitHub Actions for automated testing (optional)
- [ ] Implement analytics (Plausible, Vercel Analytics, or GA)

---

**Deployment complete!** 🎉

Your MTG Assistant is now live and accessible to anyone with the URL (and an email in your `allowed_users` table).
