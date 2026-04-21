import { NextResponse } from 'next/server';
import { getRedis } from './server/redis';
import { getActiveVisitorCount, handleVisitorRegisterOrHeartbeat } from './server/service';
import { logVisitorsError } from './server/http';

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
    // Check if request has a body before parsing
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }

    // Safely parse request body
    let body;
    try {
      const text = await request.text();
      if (!text || text.trim().length === 0) {
        return NextResponse.json(
          { error: 'Request body is required and cannot be empty' },
          { status: 400 }
        );
      }
      body = JSON.parse(text);
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body', details: parseError.message },
        { status: 400 }
      );
    }

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
      case 'heartbeat':
        return NextResponse.json(
          await handleVisitorRegisterOrHeartbeat(redisClient, {
            sessionId,
            action,
            includeCount,
          })
        );

      case 'count': {
        const validCount = await getActiveVisitorCount(redisClient, now);

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
    const { message, isConfigError } = logVisitorsError('Visitors API', error);

    return NextResponse.json(
      { 
        error: isConfigError ? 'Visitor tracking is not configured' : 'Failed to process visitor tracking request',
        details: message, // Always include details for debugging
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

    const count = await getActiveVisitorCount(redisClient);

    return NextResponse.json({ count });
  } catch (error) {
    const { message, isConfigError } = logVisitorsError('Visitors API GET', error);

    return NextResponse.json(
      { 
        error: isConfigError ? 'Visitor tracking is not configured' : 'Failed to get visitor count',
        details: message, // Always include details for debugging
      },
      { status: 500 }
    );
  }
}

