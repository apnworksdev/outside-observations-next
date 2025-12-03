# Deploy Main Branch to Production

When you're ready to replace the production branch with everything from main:

## Quick Command (Recommended)

```bash
# Make sure you're on production branch
git checkout production

# Replace everything with main branch
git reset --hard main

# Force push to update remote production branch
git push origin production --force
```

## Step-by-Step Explanation

1. **Switch to production branch:**
   ```bash
   git checkout production
   ```

2. **Reset production to match main exactly:**
   ```bash
   git reset --hard main
   ```
   This completely replaces production with main. All the cleanup we did will be overwritten.

3. **Push to remote:**
   ```bash
   git push origin production --force
   ```
   The `--force` flag is needed because we're rewriting history. This is safe since production is just a deployment branch.

## What This Does

- ✅ Completely replaces production with main
- ✅ No merge conflicts (no merge needed)
- ✅ All files from main will be in production
- ✅ All the cleanup we did will be overwritten (which is what you want)

## Alternative: Create a Fresh Production Branch

If you prefer to be extra safe, you can delete and recreate the production branch:

```bash
# Delete local production branch
git branch -D production

# Delete remote production branch
git push origin --delete production

# Create new production branch from main
git checkout -b production main

# Push new production branch
git push -u origin production
```

## After Deployment

Once you push, Netlify will automatically:
- Detect the changes
- Rebuild the site
- Deploy the new version

No additional configuration needed!

