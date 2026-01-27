# Netlify Deployment Guide

## Potential Issues & Solutions

### ✅ Critical: Environment Variables

You **must** set these environment variables in Netlify's dashboard (Site settings → Environment variables):

**Required:**
- `NEXT_PUBLIC_SANITY_PROJECT_ID` - Your Sanity project ID
- `NEXT_PUBLIC_SANITY_DATASET` - Your Sanity dataset (usually "production")
- `OUTSIDE_OBSERVATIONS_API_KEY` - API key for your external AI service
- `OUTSIDE_OBSERVATIONS_API_BASE_URL` - Base URL for your external AI service (e.g., `https://your-service-id.region.run.app`)

**Optional (have defaults):**
- `NEXT_PUBLIC_SANITY_API_VERSION` - Defaults to "2025-09-22" if not set
- `NEXT_PUBLIC_SITE_URL` - Canonical and Open Graph URLs (defaults to `https://outside-observation.com`)
- `NEXT_PUBLIC_GA4_MEASUREMENT_ID` - GA4 measurement ID (defaults to your GA4 property in code)

**How to set:**
1. Go to Netlify Dashboard → Your Site → Site settings → Environment variables
2. Add each variable with its value
3. Redeploy after adding variables

### ⚠️ Issue 1: Missing @svgr/webpack Dependency

**Problem:** Your `next.config.mjs` references `@svgr/webpack` in the experimental turbo rules, but it's not in your `package.json`.

**Impact:** This might cause build failures if you're using SVG imports with the turbo loader.

**Solution:** 
- If you're not using SVG imports, this won't affect you
- If you are using SVG imports, add `@svgr/webpack` to your dependencies:
  ```bash
  npm install @svgr/webpack
  ```

### ⚠️ Issue 2: Next.js 15.5.3 Compatibility

**Status:** Netlify supports Next.js 15, but ensure you're using the latest `@netlify/plugin-nextjs` plugin (included in `netlify.toml`).

**Action:** The `netlify.toml` file I created includes the Next.js plugin which should handle this automatically.

### ⚠️ Issue 3: API Routes & Server Actions

**Status:** Your API routes use server-side environment variables correctly (not `NEXT_PUBLIC_`), which is good.

**Note:** One route (`/api/compare-items/route.js`) uses `'use server'` directive, which is fine for Next.js 15 on Netlify.

### ⚠️ Issue 4: Build Command

**Current:** `npm run build` (as specified in package.json)

**Note:** Netlify will use this automatically. The `netlify.toml` explicitly sets it for clarity.

### ⚠️ Issue 5: Node Version

**Recommendation:** Netlify defaults to Node 18, but Next.js 15 works best with Node 20.

**Solution:** The `netlify.toml` sets `NODE_VERSION = "20"` to ensure compatibility.

### ⚠️ Issue 6: Sanity Studio Route

**Status:** Your Sanity Studio is mounted at `/studio/[[...tool]]/page.jsx`.

**Note:** This should work fine on Netlify, but ensure your Sanity project allows the Netlify domain in CORS settings if needed.

### ⚠️ Issue 7: External API Calls

**Status:** Your API routes make external calls to:
- `https://your-service-id.region.run.app`

**Note:** Ensure this service allows requests from Netlify's IP ranges. If it has IP restrictions, you may need to whitelist Netlify's IPs.

### ✅ Issue 8: generateStaticParams Error Handling (FIXED)

**Problem:** The `generateStaticParams` function in `/archive/entry/[slug]/page.js` could fail if:
- Sanity API is unreachable during build
- Query returns null/undefined instead of an array
- Network errors occur during build

**Impact:** Build would fail completely if Sanity fetch fails.

**Solution:** ✅ **FIXED** - Added try-catch and null checking to gracefully handle failures. If Sanity is unreachable during build, it returns an empty array and pages will be generated on-demand instead.

## Deployment Steps

1. **Push your code to GitHub/GitLab/Bitbucket**

2. **Connect to Netlify:**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your repository

3. **Set Environment Variables:**
   - In site settings, add all required environment variables listed above

4. **Deploy:**
   - Netlify will automatically detect the `netlify.toml` file
   - The build should start automatically
   - Monitor the build logs for any issues

5. **Verify:**
   - Check that all API routes work (they require the API key)
   - Test Sanity Studio at `/studio`
   - Verify external API connections work

## Troubleshooting

### Build Fails
- Check build logs in Netlify dashboard
- Verify all environment variables are set
- Ensure Node version is 20 (set in netlify.toml)

### API Routes Return 500
- Verify `OUTSIDE_OBSERVATIONS_API_KEY` is set correctly
- Check that external API service is accessible from Netlify
- Review function logs in Netlify dashboard

### Sanity Studio Not Working
- Verify `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET` are set
- Check Sanity project CORS settings
- Ensure Sanity project is accessible

### Environment Variables Not Working
- Remember: Variables starting with `NEXT_PUBLIC_` are exposed to the browser
- Server-only variables (like `OUTSIDE_OBSERVATIONS_API_KEY`) are only available in API routes
- After adding variables, you must redeploy

## Additional Notes

- The `netlify.toml` file I created will be automatically used by Netlify
- Netlify's Next.js plugin handles most Next.js-specific configurations automatically
- Your middleware should work fine on Netlify
- All your API routes are properly configured for serverless functions

