# Quick Setup Checklist

## ✅ What's Been Configured

1. **netlify.toml** - Branch-specific environment variables set
2. **middleware.js** - Detects production vs preview and applies redirects accordingly
3. **layout.js** - Conditionally shows/hides navigation based on environment

## 🚀 Quick Start Steps

### 1. Create Production Branch
```bash
git checkout -b production
git push -u origin production
```

### 2. In Netlify Dashboard

**A. Set Production Branch:**
- Site settings → Build & deploy → Continuous Deployment
- Production branch: `production`

**B. Enable Password Protection:**
- Site settings → Access control → Password protection
- Enable for: **Branch deploys** and **Deploy previews** (NOT production)
- Set password

**C. Set Environment Variables:**

For **Production** context:
```
NEXT_PUBLIC_DEPLOYMENT_ENV=production
NEXT_PUBLIC_SANITY_PROJECT_ID=<your-id>
NEXT_PUBLIC_SANITY_DATASET=<your-dataset>
OUTSIDE_OBSERVATIONS_API_KEY=<your-key>
OUTSIDE_OBSERVATIONS_API_BASE_URL=<your-url>
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

For **Branch deploys** context (same variables, different URL):
```
NEXT_PUBLIC_DEPLOYMENT_ENV=preview
NEXT_PUBLIC_SANITY_PROJECT_ID=<your-id>
NEXT_PUBLIC_SANITY_DATASET=<your-dataset>
OUTSIDE_OBSERVATIONS_API_KEY=<your-key>
OUTSIDE_OBSERVATIONS_API_BASE_URL=<your-url>
NEXT_PUBLIC_SITE_URL=https://main--your-site.netlify.app
```

### 3. Test

**Production (production branch):**
- Visit your main domain
- Should see launch countdown only
- All other URLs redirect to home
- No password required

**Preview (main branch):**
- Visit branch deploy URL (e.g., `main--your-site.netlify.app`)
- Should prompt for password
- After login: full site accessible
- Studio works at `/studio`
- Navigation visible

## 📝 Workflow

**Daily work:**
```bash
git checkout main
# Make changes
git push origin main
# Test on preview URL (password protected)
```

**Deploy to production:**
```bash
git checkout production
git merge main
git push origin production
# Live site updates automatically
```

## 🔍 Troubleshooting

**If production shows full site:**
- Check `NEXT_PUBLIC_DEPLOYMENT_ENV=production` is set in Production environment variables
- Verify production branch is set correctly in Netlify

**If preview doesn't work:**
- Check password protection is enabled for "Branch deploys"
- Verify you're accessing branch deploy URL, not production
- Check environment variables are set for "Branch deploys" context

