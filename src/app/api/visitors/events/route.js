import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Initialize Redis client
let redis = null;

function getRedis() {
  // Support both naming conventions
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN;

  if (!redisUrl || !redisToken) {
    const missingVars = [];
    if (!redisUrl) missingVars.push('UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_URL');
    if (!redisToken) missingVars.push('UPSTASH_REDIS_REST_TOKEN or UPSTASH_REDIS_TOKEN');
    throw new Error(`Upstash Redis is not configured. Missing: ${missingVars.join(', ')}`);
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

/**
 * GET /api/visitors/events
 * 
 * Returns recent visitor events (visitor joined/left)
 * Clients poll this endpoint to get notifications
 * Events expire after 60 seconds
 */
export async function GET() {
  try {
    // Check for Redis configuration (support both naming conventions)
    const hasRedisUrl = !!(process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL);
    const hasRedisToken = !!(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN);
    
    if (!hasRedisUrl || !hasRedisToken) {
      console.error('[Visitors Events API] Missing Redis configuration:', {
        hasRedisUrl,
        hasRedisToken,
        envVars: Object.keys(process.env).filter(k => k.includes('UPSTASH') || k.includes('REDIS')),
      });
      return NextResponse.json(
        { 
          error: 'Visitor tracking is not configured',
          details: `Missing: ${!hasRedisUrl ? 'UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_URL' : ''} ${!hasRedisToken ? 'UPSTASH_REDIS_REST_TOKEN or UPSTASH_REDIS_TOKEN' : ''}`.trim(),
        },
        { status: 500 }
      );
    }

    const redisClient = getRedis();

    // Use sorted set (ZSET) to get events efficiently
    // Get events from the last 60 seconds (newest first)
    const now = Date.now();
    const cutoffTime = now - 60000; // 60 seconds ago
    
    // Get events - O(log N + M) where M is number of results
    // OPTIMIZATION: Only fetch recent events (last 10) instead of all events
    // This reduces data transfer significantly
    let eventMembers = [];
    try {
      // Get only the last 10 members with scores, reversed (newest first)
      // This is much more efficient than fetching all events
      const allWithScores = await redisClient.zrange('visitor:events', 0, 9, {
        rev: true,
        withScores: true,
      }) || [];
      
      // allWithScores format: [member1, score1, member2, score2, ...]
      // Filter by score range (only events from last 60 seconds)
      for (let i = 0; i < allWithScores.length; i += 2) {
        const member = allWithScores[i];
        const score = allWithScores[i + 1];
        if (score && score >= cutoffTime && score <= now) {
          eventMembers.push(member);
        } else if (score && score < cutoffTime) {
          // Since we're iterating newest first, if we hit an old event, we can stop
          break;
        }
      }
    } catch (e) {
      // If sorted set doesn't exist or other error, return empty array
      // Only log in development to avoid cluttering production logs
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching events:', e);
      }
      eventMembers = [];
    }
    
    // Parse events
    const events = [];
    for (const member of eventMembers) {
      try {
        const event = typeof member === 'string' ? JSON.parse(member) : member;
        events.push(event);
      } catch (e) {
        // Skip invalid events (silently in production)
        if (process.env.NODE_ENV === 'development') {
          console.error('Error parsing event:', e);
        }
      }
    }

    return NextResponse.json({
      events,
    });
  } catch (error) {
    // Log error for debugging (always log to help diagnose production issues)
    console.error('[Visitors Events API] Error:', {
      message: error.message,
      hasRedisUrl: !!(process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL),
      hasRedisToken: !!(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN),
      stack: error.stack,
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to get visitor events', 
        details: error.message // Always include details for debugging
      },
      { status: 500 }
    );
  }
}
