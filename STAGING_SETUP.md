# 🚀 Staging Environment Setup Guide

## Overview

This guide explains how to set up a staging environment for SaveKW2 on Render.com.

## Prerequisites

- GitHub account with access to savekw2 repository
- Render.com account (free tier available)
- Supabase project (staging or separate)
- Discord OAuth app for staging (if using auth)

## Steps

### 1. Prepare Staging Infrastructure

#### Option A: Use Separate Supabase Project (Recommended)

```bash
# Create a new Supabase project named "savekw2-staging"
# 1. Go to https://supabase.com
# 2. Create new project
# 3. Copy credentials:
#    - Project URL → NEXT_PUBLIC_SUPABASE_URL
#    - Anon Key → NEXT_PUBLIC_SUPABASE_ANON_KEY
#    - Service Role Key → SUPABASE_SERVICE_ROLE_KEY
```

#### Option B: Use Same Database with Different Schema

- Pros: Cheaper, easier to manage
- Cons: Share same database with production
- Consider using row-level security (RLS) policies

### 2. Create staging Branch

```bash
# Create and push staging branch
git checkout -b staging
git push origin staging
```

### 3. (No Secrets Needed)

This project uses **Supabase for authentication**, so no NextAuth secrets are required.

### 4. Set Up Render.com Service

1. **Connect GitHub**
   - Go to https://dashboard.render.com/
   - Click "New Web Service"
   - Connect your GitHub repository
   - Select `savekw2` repository

2. **Configure Service**
   - Name: `savekw2-staging` (or similar)
   - Environment: `Node`
   - Region: Choose closest to your users
   - Branch: `staging`
   - Build Command: `npm install && npm run build && npx prisma generate && npx prisma db push`
   - Start Command: `npm start`

3. **Add Environment Variables** (in Render dashboard)
   - Copy all variables from `env.staging` template
   - Replace placeholder values with your actual staging credentials
   - ⚠️ **NEVER** commit real secrets to GitHub!

4. **Set Node Version**
   - Advanced settings → Node Version: `20.x` (or current LTS)

5. **Configure Disk Space**
   - If using file uploads, add a persistent disk at `/data`

### 6. Auto-Deploy Setup (Optional)

Render automatically deploys when you push to the `staging` branch:

- Push to `staging` branch → Automatic rebuild and deploy
- No additional setup needed beyond GitHub connection

### 7. Database Migration

After deployment:

```bash
# Manually run migrations if needed
# Option 1: Through Render dashboard
#   - Click "Shell" on your service
#   - Run: npx prisma db push

# Option 2: Automatic on build
#   - Already included in build command above
```

### 8. Verify Deployment

1. Check Render logs: Dashboard → Service → Logs
2. Verify URL is accessible: `https://savekw2-staging.onrender.com`
3. Test key features:
   - Login (if auth configured)
   - Settings pages
   - API endpoints (tRPC)

### 9. Monitoring & Logs

**Render Dashboard:**

- Live logs of deployment and runtime
- CPU, memory, disk usage stats
- Restart service button

**Application Logs:**

- Check `src/logger.ts` outputs in Render logs
- Use system logs in settings page

## Environment Variables Reference

| Variable                        | Staging              | Notes                          |
| ------------------------------- | -------------------- | ------------------------------ |
| `NODE_ENV`                      | `production`         | Auto-set by Render             |
| `NEXT_PUBLIC_SUPABASE_URL`      | Staging DB URL       | Must be STAGING not production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Staging anon key     | Public, safe to expose         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Staging service role | Secret, never expose           |
| `DATABASE_URL`                  | Supabase pooler URL  | Port 6543 for stability        |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` | Test or staging key  | Test key works on any domain   |

## Troubleshooting

### Build fails with "DATABASE_URL is required"

- Check Environment Variables in Render dashboard
- Ensure `DATABASE_URL` is set correctly
- For development: set `SKIP_ENV_VALIDATION=true`

### Deploy successful but site shows errors

- Check Render logs: Dashboard → Logs
- Check Supabase connection: verify URL and keys
- Test database connection locally first

### Images not loading

- Ensure Supabase URL is correct
- Check CORS settings if using external CDN

### Auth not working

- Verify Supabase credentials are correct (URL and keys)
- Check Supabase dashboard → Authentication settings

## Rolling Back

If staging is broken:

```bash
# Find working commit
git log staging --oneline

# Revert to previous version
git revert <commit-hash>
git push origin staging

# Render will automatically redeploy
```

## CI/CD Integration (GitHub Actions)

Optional: Add GitHub Actions for automated tests before deploy:

```yaml
# .github/workflows/staging.yml
name: Deploy to Staging

on:
  push:
    branches: [staging]

jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
      - run: npm ci
      - run: npm run lint
      - run: npm run check
      # Render automatically deploys after push
```

## Next Steps

1. **Create staging database** (Supabase)
2. **Set up Discord OAuth** (if using auth)
3. **Create staging branch** (`git checkout -b staging`)
4. **Connect to Render.com**
5. **Add environment variables**
6. **Test deployment**
7. **Monitor logs and performance**

---

**Questions?**

- Render docs: https://render.com/docs
- Supabase docs: https://supabase.com/docs
- Next.js deployment: https://nextjs.org/docs/deployment
