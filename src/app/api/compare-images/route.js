'use server';

import { NextResponse } from 'next/server';

const COMPARISON_API_URL =
  process.env.OUTSIDE_OBSERVATIONS_COMPARE_API_URL ??
  'https://outside-observations-ai-398532801393.us-central1.run.app/api/compare-images';

export async function POST(request) {
  try {
    const apiKey = process.env.OUTSIDE_OBSERVATIONS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'API key is not configured. Please set OUTSIDE_OBSERVATIONS_API_KEY in your environment variables.',
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { image1, image2 } = body ?? {};

    if (!image1 || !image2) {
      return NextResponse.json(
        { error: 'Both image1 and image2 payloads are required.' },
        { status: 400 }
      );
    }

    const response = await fetch(COMPARISON_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ image1, image2 }),
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
      { error: 'Failed to compare images.', details: error.message },
      { status: 500 }
    );
  }
}


