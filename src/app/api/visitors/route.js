import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Initialize Redis client
// These environment variables will be set in Netlify or locally in .env.local
let redis = null;

// Lazy initialization to provide better error messages
function getRedis() {
  // Support both naming conventions:
  // - UPSTASH_REDIS_URL / UPSTASH_REDIS_TOKEN (standard)
  // - UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (Upstash dashboard naming)
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    throw new Error('Upstash Redis is not configured. Please set UPSTASH_REDIS_URL (or UPSTASH_REDIS_REST_URL) and UPSTASH_REDIS_TOKEN (or UPSTASH_REDIS_REST_TOKEN) environment variables.');
  }

  if (!redis) {
    try {
      redis = new Redis({
        url: redisUrl,
        token: redisToken,
      });
    } catch (error) {
      throw new Error(`Failed to initialize Redis client: ${error.message}`);
    }
  }

  return redis;
}

// Visitor session TTL (time-to-live) in seconds
// After this time, the visitor is considered inactive
const VISITOR_TTL = 300; // 5 minutes

/**
 * POST /api/visitors
 * 
 * Handles visitor tracking:
 * - 'register': Registers a new visitor session
 * - 'heartbeat': Updates the last activity timestamp for an existing session
 * - 'count': Returns the current number of active visitors
 * 
 * Body: { sessionId: string, action: 'register' | 'heartbeat' | 'count' }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { sessionId, action, includeCount = false } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'sessionId is required and must be a string' },
        { status: 400 }
      );
    }

    // Get Redis client (will throw if not configured)
    const redisClient = getRedis();

    const now = Date.now();

    switch (action) {
      case 'register':
      case 'heartbeat': {
        // Use sorted set (ZSET) to track visitors with last activity timestamp as score
        // This allows efficient counting and automatic cleanup of expired visitors
        const cutoffTime = now - (VISITOR_TTL * 1000); // 5 minutes ago in milliseconds
        
        // Check if visitor exists (only for new visitor detection)
        // OPTIMIZATION: Only check on register, not on heartbeat
        let isNewVisitor = false;
        if (action === 'register') {
          const lastActivity = await redisClient.zscore('visitor:active', sessionId);
          isNewVisitor = (lastActivity === null || lastActivity === undefined);
        }
        
        // Update visitor's last activity timestamp in sorted set
        // OPTIMIZATION: Removed redundant set() operation - ZSET is sufficient
        await redisClient.zadd('visitor:active', { score: now, member: sessionId });
        
        // Clean up expired visitors (older than 5 minutes) - efficient O(log N + M)
        // OPTIMIZATION: Reduced cleanup frequency to 5% (was 10%) to save writes
        const shouldCleanup = Math.random() < 0.05; // 5% chance
        if (shouldCleanup) {
          await redisClient.zremrangebyscore('visitor:active', 0, cutoffTime);
        }
        
        // OPTIMIZATION: Only get count if explicitly requested (saves Redis calls)
        let count = undefined;
        if (includeCount) {
          // Get count of active visitors (those with activity in last 5 minutes)
          // ZCOUNT is O(log N) - much faster than keys() which is O(N)
          const rawCount = await redisClient.zcount('visitor:active', cutoffTime, now);
          // Ensure count is a number (zcount should return a number, but be safe)
          count = typeof rawCount === 'number' ? rawCount : 0;
        }

        // If it's a new visitor, create a notification event using sorted set
        if (isNewVisitor) {
          // Need count for the event, so fetch it if not already fetched
          if (count === undefined) {
            const rawCount = await redisClient.zcount('visitor:active', cutoffTime, now);
            // Ensure count is a number
            count = typeof rawCount === 'number' ? rawCount : 0;
          }
          
          // OPTIMIZATION: Batch event creation and cleanup in parallel
          const eventCutoffTime = now - 60000;
          await Promise.all([
            redisClient.zadd(
              'visitor:events',
              {
                score: now,
                member: JSON.stringify({
                  type: 'visitor_joined',
                  count,
                  timestamp: now,
                }),
              }
            ),
            // Clean up old events (older than 60 seconds)
            redisClient.zremrangebyscore('visitor:events', 0, eventCutoffTime),
          ]);
        }
        
        return NextResponse.json({
          success: true,
          ...(count !== undefined && { count }), // Only include count if fetched
          action,
          isNewVisitor,
        });
      }

      case 'count': {
        // Get count of active visitors (those with activity in last 5 minutes)
        const now = Date.now();
        const cutoffTime = now - (VISITOR_TTL * 1000);
        const count = await redisClient.zcount('visitor:active', cutoffTime, now);
        
        // Ensure count is a number (zcount should return a number, but be safe)
        const validCount = typeof count === 'number' ? count : 0;
        
        return NextResponse.json({
          count: validCount,
        });
      }

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Must be 'register', 'heartbeat', or 'count'` },
          { status: 400 }
        );
    }
  } catch (error) {
    const errorMessage = error.message || 'Unknown error';
    const isConfigError = errorMessage.includes('not configured') || errorMessage.includes('initialize Redis');
    
    return NextResponse.json(
      { 
        error: isConfigError ? 'Visitor tracking is not configured' : 'Failed to process visitor tracking request',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/visitors
 * 
 * Returns the current number of active visitors
 */
export async function GET() {
  try {
    // Get Redis client (will throw if not configured)
    const redisClient = getRedis();

    // Get count of active visitors (those with activity in last 5 minutes)
    const now = Date.now();
    const cutoffTime = now - (VISITOR_TTL * 1000);
    const rawCount = await redisClient.zcount('visitor:active', cutoffTime, now);
    
    // Ensure count is a number (zcount should return a number, but be safe)
    const count = typeof rawCount === 'number' ? rawCount : 0;
    
    return NextResponse.json({ count });
  } catch (error) {
    const errorMessage = error.message || 'Unknown error';
    const isConfigError = errorMessage.includes('not configured') || errorMessage.includes('initialize Redis');
    
    return NextResponse.json(
      { 
        error: isConfigError ? 'Visitor tracking is not configured' : 'Failed to get visitor count',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

