import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Initialize Redis client
let redis = null;

function getRedis() {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    throw new Error('Upstash Redis is not configured');
  }

  if (!redis) {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
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
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return NextResponse.json(
        { error: 'Visitor tracking is not configured' },
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
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in /api/visitors/events:', error);
    }
    return NextResponse.json(
      { 
        error: 'Failed to get visitor events', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      },
      { status: 500 }
    );
  }
}
