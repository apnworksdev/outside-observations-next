# Visitor Tracking Setup Guide

This guide explains how to set up and test the live visitor tracking feature using Upstash Redis.

## Overview

The visitor tracker uses Upstash Redis (serverless Redis) to track active visitors in real-time. Each visitor session:
- Is registered when they visit the site
- Sends a heartbeat every 30 seconds to stay active
- Expires after 5 minutes of inactivity
- Is tracked across all server instances (accurate count)

## Setup Instructions

### 1. Create Upstash Redis Database

1. Go to [https://upstash.com](https://upstash.com)
2. Sign up for a free account (or log in)
3. Click "Create Database"
4. Choose:
   - **Type**: Redis
   - **Region**: Choose closest to your users (or use default)
   - **Name**: `visitor-tracking` (or any name you prefer)
5. Click "Create"
6. Wait for the database to be created (takes ~30 seconds)

### 2. Get Your Credentials

Once the database is created:

1. Click on your database name
2. You'll see two important values:
   - **UPSTASH_REDIS_URL**: The REST API URL (starts with `https://`)
   - **UPSTASH_REDIS_TOKEN**: The REST API token (long string)

### 3. Set Environment Variables Locally

Create or update `.env.local` in your project root:

```bash
UPSTASH_REDIS_URL=https://your-database-url.upstash.io
UPSTASH_REDIS_TOKEN=your-token-here
```

**Important**: 
- Never commit `.env.local` to git (it should already be in `.gitignore`)
- Replace the values with your actual Upstash credentials

### 4. Set Environment Variables on Netlify

For production deployment:

1. Go to Netlify Dashboard → Your Site → Site settings → Environment variables
2. Add these two variables:
   - `UPSTASH_REDIS_URL` = your Upstash URL
   - `UPSTASH_REDIS_TOKEN` = your Upstash token
3. Redeploy your site after adding the variables

## Testing Locally

### 1. Start Your Development Server

```bash
pnpm dev
```

### 2. Open Your Browser

Navigate to `http://localhost:3000` (or your dev port)

### 3. Check the Console

Open your browser's developer console (F12 or Cmd+Option+I). You should see:

```
[Visitor Tracker] ✅ Registered as visitor. Session ID: visitor_1234567890_abc123
[Visitor Tracker] 👥 Current active visitors: 1
[Visitor Tracker] 💡 You can call window.getVisitorCount() to check the current visitor count
```

### 4. Test Multiple Visitors

To simulate multiple visitors:

**Option A: Multiple Browser Windows**
- Open multiple browser windows/tabs to `http://localhost:3000`
- Each window will register as a separate visitor
- Check the console in each window to see the count increase

**Option B: Incognito/Private Windows**
- Open incognito/private windows
- Each will have a separate session, so they count as different visitors

**Option C: Different Browsers**
- Open the site in Chrome, Firefox, Safari, etc.
- Each browser will be a separate visitor

### 5. Test Heartbeat

After 30 seconds, you should see in the console:

```
[Visitor Tracker] 💓 Heartbeat sent. Active visitors: X
```

This confirms the session is being kept alive.

### 6. Test Manual Count Check

In the browser console, you can manually check the count:

```javascript
await window.getVisitorCount()
```

This will log the current visitor count.

### 7. Test Session Expiry

To test that sessions expire after 5 minutes:

1. Open a browser window
2. Wait for it to register
3. Close the browser window (or stop sending heartbeats)
4. Wait 5 minutes
5. Check the count from another window - it should decrease

## How It Works

### Client Side (`VisitorTracker.js`)

1. **On Mount**: Generates a unique session ID (or retrieves from sessionStorage)
2. **Registration**: Sends a POST request to `/api/visitors` with action `register`
3. **Heartbeat**: Every 30 seconds, sends a POST request with action `heartbeat`
4. **Logging**: All actions are logged to the console

### Server Side (`/api/visitors/route.js`)

1. **Register/Heartbeat**: Stores the visitor session in Redis with a 5-minute TTL
2. **Count**: Queries Redis for all active visitor keys and returns the count
3. **Auto-cleanup**: Redis automatically removes expired sessions (after 5 minutes)

### Redis Storage

- **Key format**: `visitor:{sessionId}`
- **Value**: Timestamp of last activity
- **TTL**: 300 seconds (5 minutes)
- **Auto-expiry**: Redis automatically deletes keys after TTL expires

## Console Logs

The tracker logs the following to the browser console:

- `✅ Registered as visitor` - When a new visitor registers
- `💓 Heartbeat sent` - Every 30 seconds to keep session alive
- `👥 Current active visitors: X` - Shows the current count
- `💡 You can call window.getVisitorCount()...` - Helper message

Server-side logs (visible in Netlify function logs or terminal):

- `[Visitor Tracker] Registered visitor...` - When visitor registers
- `[Visitor Tracker] Heartbeat visitor...` - When heartbeat is received
- `[Visitor Tracker] Count requested...` - When count is fetched

## Troubleshooting

### "Visitor tracking is not configured"

**Problem**: Environment variables are not set.

**Solution**: 
- Check that `.env.local` exists and has the correct variables
- Restart your dev server after adding environment variables
- For Netlify, ensure variables are set in the dashboard

### Count shows 0 or doesn't update

**Problem**: Redis connection issue or TTL expired.

**Solution**:
- Check that your Upstash credentials are correct
- Verify the database is active in Upstash dashboard
- Check browser console for error messages
- Check server logs for Redis connection errors

### Multiple visitors but count is 1

**Problem**: Same session ID being reused (sessionStorage persistence).

**Solution**: This is expected behavior - same browser/tab uses the same session. To test multiple visitors, use:
- Different browsers
- Incognito windows
- Different devices

### Heartbeat not working

**Problem**: Interval might be cleared or component unmounted.

**Solution**:
- Check browser console for errors
- Verify the component is mounted (check React DevTools)
- Ensure the page isn't being navigated away from

## Upstash Free Tier Limits

- **10,000 commands per day** - More than enough for visitor tracking
- **256 MB storage** - Plenty for session data
- **No credit card required** - Free tier is generous

For visitor tracking, each visitor uses:
- 1 command per registration
- 1 command per heartbeat (every 30 seconds)
- 1 command per count check

Example: 100 active visitors = ~200 commands per minute = ~288,000 per day (exceeds free tier, but you'd need significant traffic)

## Next Steps

Once you've verified it works locally:

1. Add the environment variables to Netlify
2. Deploy your changes
3. Test on the production site
4. When ready, add a UI component to display the count (instead of just console logs)

## Security Notes

- Session IDs are generated client-side and are not tied to user identity
- No personal information is stored
- Sessions expire automatically after 5 minutes
- Redis credentials are server-side only (never exposed to client)

