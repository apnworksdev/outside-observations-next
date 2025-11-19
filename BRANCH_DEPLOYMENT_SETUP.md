# Branch Deployment Setup Guide

This guide explains how to set up two different deployment environments:
- **Production branch** → Live site (launch countdown only)
- **Main branch** → Preview site on subdomain (full site access, password protected)

## Overview

- **Production branch**: Shows only the launch countdown page, redirects all other URLs to home
- **Main branch**: Full site access on a preview subdomain, protected with Netlify password protection

## Step 1: Set Up Branches in Git

1. **Create a production branch:**
   ```bash
   git checkout -b production
   git push -u origin production
   ```

2. **Keep main branch as your development/preview branch:**
   ```bash
   git checkout main
   ```

## Step 2: Configure Netlify Site Settings

### A. Set Production Branch

1. Go to **Netlify Dashboard** → Your Site → **Site settings** → **Build & deploy** → **Continuous Deployment**
2. Under **Production branch**, select `production` (or your production branch name)
3. Save changes

### B. Enable Branch Deploys

1. In the same section, under **Branch deploys**, select:
   - ✅ **Deploy only the production branch** (unchecked - we want branch deploys)
   - ✅ **Deploy all branches** (checked - or specific branches you want)

### C. Set Up Custom Subdomain for Main Branch

1. Go to **Site settings** → **Domain management** → **Custom domains**
2. Add a subdomain (e.g., `preview.yourdomain.com` or `staging.yourdomain.com`)
3. Or use Netlify's default branch deploy URL (e.g., `main--your-site.netlify.app`)

## Step 3: Enable Password Protection for Preview

1. Go to **Site settings** → **Access control** → **Password protection**
2. Click **Enable password protection**
3. **Important**: Under **Deploy contexts**, select:
   - ✅ **Branch deploys** (this protects main branch)
   - ✅ **Deploy previews** (optional - protects PR previews)
   - ❌ **Production** (unchecked - production is public)
4. Set a password
5. Save changes

## Step 4: Configure Environment Variables

### Production Branch Variables

Go to **Site settings** → **Environment variables** → **Production**:

```
NEXT_PUBLIC_SANITY_PROJECT_ID=<your-project-id>
NEXT_PUBLIC_SANITY_DATASET=<your-dataset>
OUTSIDE_OBSERVATIONS_API_KEY=<your-api-key>
OUTSIDE_OBSERVATIONS_API_BASE_URL=<your-api-url>
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### Main Branch Variables (Preview)

Go to **Site settings** → **Environment variables** → **Branch deploys**:

```
NEXT_PUBLIC_SANITY_PROJECT_ID=<your-project-id>
NEXT_PUBLIC_SANITY_DATASET=<your-dataset>
OUTSIDE_OBSERVATIONS_API_KEY=<your-api-key>
OUTSIDE_OBSERVATIONS_API_BASE_URL=<your-api-url>
NEXT_PUBLIC_SITE_URL=https://preview.yourdomain.com
```

## Step 5: How It Works

### Production Branch Behavior

- **URL**: Your main domain (e.g., `https://yourdomain.com`)
- **Behavior**: 
  - Shows launch countdown page on homepage
  - Redirects all other URLs to home
  - Studio is also redirected (not accessible)
- **Access**: Public (no password)

### Main Branch Behavior

- **URL**: Preview subdomain (e.g., `https://main--your-site.netlify.app` or custom subdomain)
- **Behavior**:
  - Full site access (all pages work normally)
  - Studio accessible at `/studio`
  - No redirects
- **Access**: Password protected

## Step 6: Deployment Workflow

### Deploying to Production

1. Make changes on `main` branch
2. Test on preview subdomain (password protected)
3. When ready, merge to `production` branch:
   ```bash
   git checkout production
   git merge main
   git push origin production
   ```
4. Netlify automatically deploys production branch to live site

### Working on Preview

1. Push to `main` branch:
   ```bash
   git checkout main
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
2. Netlify automatically creates a branch deploy
3. Access via preview URL (password protected)
4. Test all functionality including studio

## Step 7: Verify Setup

### Check Production Site

1. Visit your production domain
2. Should see launch countdown page
3. Try visiting `/archive` or `/studio` - should redirect to home
4. No password required

### Check Preview Site

1. Visit preview subdomain (or branch deploy URL)
2. Should be prompted for password
3. After entering password, full site should be accessible
4. `/studio` should work
5. All pages should work normally

## Troubleshooting

### Production site shows full site instead of countdown

- Check that `NEXT_PUBLIC_DEPLOYMENT_ENV` is set to `production` in production environment variables
- Verify you're on the production branch in Netlify settings
- Check middleware is reading the environment variable correctly

### Preview site is not password protected

- Verify password protection is enabled for "Branch deploys" in Netlify settings
- Check that you're accessing a branch deploy URL, not production
- Ensure you're not on the production branch

### Environment variables not working

- Make sure variables are set in the correct context (Production vs Branch deploys)
- Redeploy after adding/changing environment variables
- Check variable names match exactly (case-sensitive)

### Studio not accessible on preview

- Verify you're on preview (not production) branch
- Check that middleware allows studio in preview mode
- Ensure Sanity CORS settings allow the preview domain

## Additional Notes

- The `netlify.toml` file automatically sets `NEXT_PUBLIC_DEPLOYMENT_ENV` based on deploy context
- Middleware checks this variable to determine behavior
- You can add more branches by creating new contexts in `netlify.toml`
- Password protection is managed entirely in Netlify dashboard (no code changes needed)

