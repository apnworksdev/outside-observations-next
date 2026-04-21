import { NextResponse } from 'next/server';
import { getRedisConfig, getRedisMissingDetails } from './redis';

export function logVisitorsError(scope, error, extra = {}) {
  const { hasRedisUrl, hasRedisToken } = getRedisConfig();
  const message = error?.message || 'Unknown error';
  const isConfigError = message.includes('not configured') || message.includes('initialize Redis');

  console.error(`[${scope}] Error:`, {
    message,
    isConfigError,
    hasRedisUrl,
    hasRedisToken,
    stack: error?.stack,
    ...extra,
  });

  return { message, isConfigError };
}

export function visitorsConfigErrorResponse(scope, extra = {}) {
  const { hasRedisUrl, hasRedisToken } = getRedisConfig();
  console.error(`[${scope}] Missing Redis configuration:`, {
    hasRedisUrl,
    hasRedisToken,
    envVars: Object.keys(process.env).filter((k) => k.includes('UPSTASH') || k.includes('REDIS')),
    ...extra,
  });

  return NextResponse.json(
    {
      error: 'Visitor tracking is not configured',
      details: getRedisMissingDetails(),
    },
    { status: 500 }
  );
}
