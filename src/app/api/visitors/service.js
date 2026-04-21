const VISITOR_TTL_SECONDS = 300;
const VISITOR_EVENTS_TTL_MS = 60000;
const VISITOR_EVENTS_FETCH_LIMIT = 10;

function toSafeNumber(value) {
  return typeof value === 'number' ? value : 0;
}

function getVisitorCutoffTime(nowMs) {
  return nowMs - (VISITOR_TTL_SECONDS * 1000);
}

export async function getActiveVisitorCount(redisClient, nowMs = Date.now()) {
  const cutoffTime = getVisitorCutoffTime(nowMs);
  const rawCount = await redisClient.zcount('visitor:active', cutoffTime, nowMs);
  return toSafeNumber(rawCount);
}

export async function handleVisitorRegisterOrHeartbeat(redisClient, { sessionId, action, includeCount = false }) {
  const now = Date.now();
  const cutoffTime = getVisitorCutoffTime(now);

  let isNewVisitor = false;
  if (action === 'register') {
    const lastActivity = await redisClient.zscore('visitor:active', sessionId);
    isNewVisitor = (lastActivity === null || lastActivity === undefined);
  }

  await redisClient.zadd('visitor:active', { score: now, member: sessionId });

  const shouldCleanup = Math.random() < 0.05;
  if (shouldCleanup) {
    await redisClient.zremrangebyscore('visitor:active', 0, cutoffTime);
  }

  let count;
  if (includeCount) {
    count = await getActiveVisitorCount(redisClient, now);
  }

  if (isNewVisitor) {
    if (count === undefined) {
      count = await getActiveVisitorCount(redisClient, now);
    }

    const eventCutoffTime = now - VISITOR_EVENTS_TTL_MS;
    await Promise.all([
      redisClient.zadd('visitor:events', {
        score: now,
        member: JSON.stringify({
          type: 'visitor_joined',
          count,
          timestamp: now,
        }),
      }),
      redisClient.zremrangebyscore('visitor:events', 0, eventCutoffTime),
    ]);
  }

  return {
    success: true,
    ...(count !== undefined && { count }),
    action,
    isNewVisitor,
  };
}

export async function getRecentVisitorEvents(redisClient, now = Date.now()) {
  const cutoffTime = now - VISITOR_EVENTS_TTL_MS;
  let eventMembers = [];

  try {
    const allWithScores = await redisClient.zrange('visitor:events', 0, VISITOR_EVENTS_FETCH_LIMIT - 1, {
      rev: true,
      withScores: true,
    }) || [];

    for (let i = 0; i < allWithScores.length; i += 2) {
      const member = allWithScores[i];
      const score = allWithScores[i + 1];
      if (score && score >= cutoffTime && score <= now) {
        eventMembers.push(member);
      } else if (score && score < cutoffTime) {
        break;
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching events:', error);
    }
    eventMembers = [];
  }

  const events = [];
  for (const member of eventMembers) {
    try {
      const event = typeof member === 'string' ? JSON.parse(member) : member;
      events.push(event);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error parsing event:', error);
      }
    }
  }

  return events;
}
