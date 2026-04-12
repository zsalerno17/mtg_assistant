# Deployment Scripts

## test-deployment.sh

Automated test script to verify production deployment after deploying to Render and Vercel.

**Usage:**

```bash
./scripts/test-deployment.sh <BACKEND_URL> <FRONTEND_URL>
```

**Example:**

```bash
./scripts/test-deployment.sh \
  https://mtg-assistant-backend.onrender.com \
  https://mtg-assistant.vercel.app
```

**What it tests:**

1. ✅ Backend health endpoint responds with `{"status":"ok"}`
2. ✅ Backend CORS headers are configured correctly
3. ✅ Frontend is accessible (HTTP 200)
4. ✅ Frontend contains Vite build artifacts

**When to use:**

Run this script immediately after completing the deployment steps in [.github/DEPLOYMENT.md](../.github/DEPLOYMENT.md) to verify both backend and frontend are working correctly.

**Troubleshooting:**

If tests fail, check:
- Render dashboard logs (backend errors)
- Vercel dashboard logs (frontend build errors)
- Environment variables are set correctly in both platforms
- Supabase Auth redirect URLs include your Vercel URL
