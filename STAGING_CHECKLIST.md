# 🎯 Staging Setup Checklist

Використовуйте цей checklist для налаштування staging середовища на Render.com

## Pre-Setup Preparation

- [ ] Create separate Supabase project for staging (or plan to use same DB with RLS policies)
- [ ] Create hCaptcha project for staging (or use test key)
- [ ] Have Render.com account (free tier available)
- [ ] Have GitHub repository access

## Step 1: Local Preparation

- [ ] Create staging branch

  ```bash
  git checkout -b staging
  git push origin staging
  ```

- [ ] Review `env.staging` template

## Step 2: Supabase Setup (Staging Database)

### Option A: Separate Project (Recommended)

- [ ] Create new Supabase project named `savekw2-staging`
- [ ] Copy project URL → `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Copy anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Copy service role key → `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Run migrations (if using separate DB):
  ```bash
  DATABASE_URL="your_staging_url" npx prisma db push
  ```

### Option B: Same Database with RLS (Cost-effective)

- [ ] Plan row-level security policies for separation
- [ ] Document schema naming/tagging convention
- [ ] Implement RLS policies

## Step 3: Connect to Render.com

- [ ] Sign in to https://dashboard.render.com/
- [ ] Connect GitHub account (if not already connected)
- [ ] Create new "Web Service"
- [ ] Select `savekw2` repository
- [ ] Configure service:

### Service Configuration

- [ ] Name: `savekw2-staging`
- [ ] Environment: `Node`
- [ ] Region: Select closest to users
- [ ] Branch: `staging`
- [ ] Runtime: `node 20.x` (or current LTS)

### Build & Start Commands

- [ ] Build Command:
  ```
  npm install && npm run build && npx prisma db push
  ```
- [ ] Start Command:
  ```
  npm start
  ```

## Step 4: Environment Variables in Render

For each variable in the table below, add to Render dashboard:

| Variable                        | Source                   | Required |
| ------------------------------- | ------------------------ | -------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Staging Supabase         | Yes      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Staging Supabase         | Yes      |
| `SUPABASE_SERVICE_ROLE_KEY`     | Staging Supabase         | Yes      |
| `DATABASE_URL`                  | Supabase pooler URL      | Yes      |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` | hCaptcha or use test key | Optional |

### Adding Variables to Render

- [ ] Go to Service Dashboard
- [ ] Click "Environment" section
- [ ] Add each variable one by one
- [ ] ⚠️ **DO NOT** copy from local `.env.local`
- [ ] ⚠️ Use staging credentials only

## Step 5: Initial Deployment

- [ ] Trigger deployment:

  ```bash
  git add .
  git commit -m "Setup staging environment"
  git push origin staging
  ```

  Render automatically triggers build

- [ ] Monitor Render logs during build:
  - Check "Logs" section in Render dashboard
  - Build should take 3-5 minutes

## Step 6: Verify Deployment

- [ ] Deployment succeeds (green checkmark in Render dashboard)
- [ ] Open staging URL in browser: `https://your-staging-url.onrender.com`
- [ ] Check if site loads without errors
- [ ] Test login page (if auth configured)
- [ ] Check network tab for API errors
- [ ] Review Render logs for warnings/errors

### Common Issues to Check

- [ ] "DATABASE_URL is required" - add DATABASE_URL to environment
- [ ] 500 errors - check Render logs, usually missing env variable
- [ ] Images not loading - check CORS and image settings

## Step 7: Configure Notifications (Optional)

- [ ] Add GitHub notifications for failed builds
- [ ] Set up email alerts in Render for service issues
- [ ] Configure Slack/Discord webhooks (if desired)

## Step 8: Post-Deployment Testing

### Core Functionality

- [ ] [ ] Homepage loads
- [ ] [ ] Settings pages load
- [ ] [ ] Equipment selection works
- [ ] [ ] Algorithm selection works
- [ ] [ ] Navigation works

### API Endpoints (if applicable)

- [ ] [ ] tRPC endpoints respond
- [ ] [ ] Database queries work
- [ ] [ ] Logging works (check Render logs)

### Database

- [ ] [ ] Data is saved correctly
- [ ] [ ] Migrations ran successfully
- [ ] Can query test data

## Step 9: Ongoing Maintenance

### Regular Tasks

- [ ] Monitor Render dashboard for errors
- [ ] Review logs periodically
- [ ] Check resource usage (CPU, memory, disk)

### Deployment Process

- [ ] Create feature branches from `main`
- [ ] Test locally before pushing
- [ ] Create pull requests to `staging` branch
- [ ] Automatic deployment after merge to `staging`

### Troubleshooting

- [ ] Use `.github/workflows/staging-deploy.yml` for CI/CD
- [ ] Check lint and type errors before deploying
- [ ] Run `npm run check` locally before push

## Useful Commands

```bash
# View staging logs (if you have Render CLI installed)
render logs --service savekw2-staging

# Connect to staging database
psql "your_staging_database_url"

# Tail logs in real-time
render logs --service savekw2-staging --tail

# Manually trigger rebuild in Render dashboard
# Services → your-service → Manual Deploy
```

## Documentation References

- 📖 [STAGING_SETUP.md](./STAGING_SETUP.md) - Full setup guide
- 📋 [.env.example](./.env.example) - Environment variables template
- 🚀 [Render docs](https://render.com/docs)
- 🐘 [Supabase docs](https://supabase.com/docs)
- ▶️ [Next.js deployment](https://nextjs.org/docs/deployment)

## Support

If you encounter issues:

1. Check Render logs first (usually shows the problem)
2. Verify all environment variables are set
3. Try local build: `npm run build`
4. Check `.github/workflows/staging-deploy.yml` for build errors
5. Consult documentation links above

---

**Last Updated:** November 6, 2025
**Branch:** staging
**Hosting:** Render.com
