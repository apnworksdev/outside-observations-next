import { NextResponse } from 'next/server';
import { getRedis, getRedisConfig } from '../redis';
import { getRecentVisitorEvents } from '../service';
import { logVisitorsError, visitorsConfigErrorResponse } from '../http';

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
      return visitorsConfigErrorResponse('Visitors Events API');
    }

    const redisClient = getRedis();

    const events = await getRecentVisitorEvents(redisClient);

    return NextResponse.json({
      events,
    });
  } catch (error) {
    const { message } = logVisitorsError('Visitors Events API', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get visitor events', 
        details: message // Always include details for debugging
      },
      { status: 500 }
    );
  }
}
