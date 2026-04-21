import { NextResponse } from 'next/server';
import { getRedis, getRedisConfig, getRedisMissingDetails } from '../redis';
import { getRecentVisitorEvents } from '../service';

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
    const { hasRedisUrl, hasRedisToken } = getRedisConfig();
    
    if (!hasRedisUrl || !hasRedisToken) {
      console.error('[Visitors Events API] Missing Redis configuration:', {
        hasRedisUrl,
        hasRedisToken,
        envVars: Object.keys(process.env).filter(k => k.includes('UPSTASH') || k.includes('REDIS')),
      });
      return NextResponse.json(
        { 
          error: 'Visitor tracking is not configured',
          details: getRedisMissingDetails(),
        },
        { status: 500 }
      );
    }

    const redisClient = getRedis();

    const events = await getRecentVisitorEvents(redisClient);

    return NextResponse.json({
      events,
    });
  } catch (error) {
    // Log error for debugging (always log to help diagnose production issues)
    const { hasRedisUrl, hasRedisToken } = getRedisConfig();
    console.error('[Visitors Events API] Error:', {
      message: error.message,
      hasRedisUrl,
      hasRedisToken,
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
