import { Redis } from '@upstash/redis';

let redis = null;

export function getRedisConfig() {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN;

  return {
    redisUrl,
    redisToken,
    hasRedisUrl: !!redisUrl,
    hasRedisToken: !!redisToken,
  };
}

export function getRedisMissingDetails() {
  const { hasRedisUrl, hasRedisToken } = getRedisConfig();
  return `Missing: ${!hasRedisUrl ? 'UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_URL' : ''} ${!hasRedisToken ? 'UPSTASH_REDIS_REST_TOKEN or UPSTASH_REDIS_TOKEN' : ''}`.trim();
}

export function getRedis() {
  const { redisUrl, redisToken } = getRedisConfig();

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
