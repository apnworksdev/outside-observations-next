'use server';

import { NextResponse } from 'next/server';

const COMPARISON_API_PATH = '/api/compare-items';

// Helper function to safely construct API URLs
function buildApiUrl(path) {
  const baseUrl = process.env.OUTSIDE_OBSERVATIONS_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('OUTSIDE_OBSERVATIONS_API_BASE_URL is not configured');
  }
  // Remove trailing slash from base URL and ensure path starts with /
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

export async function POST(request) {
  try {
    const apiKey = process.env.OUTSIDE_OBSERVATIONS_API_KEY;
    const baseUrl = process.env.OUTSIDE_OBSERVATIONS_API_BASE_URL;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'API key is not configured. Please set OUTSIDE_OBSERVATIONS_API_KEY in your environment variables.',
        },
        { status: 500 }
      );
    }

    if (!baseUrl) {
      return NextResponse.json(
        {
          error:
            'API base URL is not configured. Please set OUTSIDE_OBSERVATIONS_API_BASE_URL in your environment variables.',
        },
        { status: 500 }
      );
    }

    const comparisonApiUrl = buildApiUrl(COMPARISON_API_PATH);

    const body = await request.json();
    const { item1, item2 } = body ?? {};

    if (!item1 || !item2) {
      return NextResponse.json(
        { error: 'Both item1 and item2 payloads are required.' },
        { status: 400 }
      );
    }

    const response = await fetch(comparisonApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ item1, item2 }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsedError;

      try {
        parsedError = JSON.parse(errorText);
      } catch {
        parsedError = null;
      }

      return NextResponse.json(
        {
          error:
            parsedError?.error ??
            parsedError?.message ??
            `Comparison API error: ${response.status} ${response.statusText}`,
          details: parsedError ?? errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected connections comparison proxy failed:', error);
    return NextResponse.json(
      { error: 'Failed to compare items.', details: error.message },
      { status: 500 }
    );
  }
}
