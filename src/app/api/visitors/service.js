const VISITOR_TTL_SECONDS = 300;
const VISITOR_EVENTS_TTL_MS = 60000;

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
