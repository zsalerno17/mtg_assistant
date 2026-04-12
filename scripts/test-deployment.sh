#!/bin/bash

# MTG Assistant - Production Deployment Test Script
# Run this after deploying to Render and Vercel to verify everything works

set -e  # Exit on error

echo "🧪 Testing MTG Assistant Production Deployment"
echo "=============================================="
echo ""

# Check if URLs are provided
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: ./scripts/test-deployment.sh <BACKEND_URL> <FRONTEND_URL>"
    echo ""
    echo "Example:"
    echo "  ./scripts/test-deployment.sh https://mtg-assistant-backend.onrender.com https://mtg-assistant.vercel.app"
    echo ""
    exit 1
fi

BACKEND_URL=$1
FRONTEND_URL=$2

echo "Backend URL:  $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo ""

# Test 1: Backend health endpoint
echo "Test 1: Backend health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n1)

if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q '"status":"ok"'; then
    echo "✅ Backend health check passed: $BODY"
else
    echo "❌ Backend health check failed (HTTP $HTTP_CODE): $BODY"
    exit 1
fi
echo ""

# Test 2: Backend CORS headers
echo "Test 2: Backend CORS configuration..."
CORS_RESPONSE=$(curl -s -I -H "Origin: $FRONTEND_URL" "$BACKEND_URL/health")

if echo "$CORS_RESPONSE" | grep -qi "access-control-allow-origin"; then
    CORS_ORIGIN=$(echo "$CORS_RESPONSE" | grep -i "access-control-allow-origin" | cut -d' ' -f2 | tr -d '\r')
    echo "✅ CORS headers present: $CORS_ORIGIN"
else
    echo "⚠️  WARNING: CORS headers not found. Frontend may have issues."
fi
echo ""

# Test 3: Frontend accessibility
echo "Test 3: Frontend accessibility..."
FRONTEND_RESPONSE=$(curl -s -w "\n%{http_code}" "$FRONTEND_URL")
HTTP_CODE=$(echo "$FRONTEND_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Frontend is accessible (HTTP 200)"
else
    echo "❌ Frontend returned HTTP $HTTP_CODE"
    exit 1
fi
echo ""

# Test 4: Frontend has Vite build artifacts
echo "Test 4: Frontend build verification..."
if echo "$FRONTEND_RESPONSE" | head -n -1 | grep -q "vite"; then
    echo "✅ Frontend appears to be a Vite build"
else
    echo "⚠️  WARNING: Frontend doesn't appear to be a Vite build"
fi
echo ""

# Summary
echo "=============================================="
echo "✅ All critical tests passed!"
echo ""
echo "Manual verification steps:"
echo "1. Open $FRONTEND_URL in your browser"
echo "2. Sign in with Google OAuth"
echo "3. Import a deck from Moxfield"
echo "4. Check that deck analysis loads correctly"
echo "5. Verify card tooltips appear on hover"
echo ""
echo "If you encounter any issues:"
echo "- Check Render logs: https://render.com/dashboard"
echo "- Check Vercel logs: https://vercel.com/dashboard"
echo "- Verify environment variables are set correctly"
echo "- Check Supabase Auth redirect URLs include: $FRONTEND_URL/auth/callback"
