import { NextResponse } from 'next/server';

const VECTOR_STORE_QUERY_URL =
  'https://outside-observations-ai-398532801393.us-central1.run.app/api/vector_store/query';

export async function POST(request) {
  /**
   * This route proxies search requests to the vector store while hiding credentials.
   * Responsibilities:
   *   - Validate presence of the shared API key.
   *   - Guard against malformed payloads (non-string queries).
   *   - Forward the request with a similarity threshold when provided.
   *   - Normalise upstream failures into structured JSON responses so the client can
   *     render friendly fallbacks without exposing implementation details.
   */
  try {
    const apiKey = process.env.OUTSIDE_OBSERVATIONS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Vector store API key is not configured. Please set OUTSIDE_OBSERVATIONS_API_KEY in your environment variables.',
        },
        { status: 500 }
      );
    }

    const { query, maxResults = 10, minSimilarity } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'A search query is required.' }, { status: 400 });
    }

    const response = await fetch(VECTOR_STORE_QUERY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        query,
        ...(typeof minSimilarity === 'number' ? { minSimilarity } : {}),
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsed;
      try {
        parsed = JSON.parse(errorText);
      } catch {
        parsed = null;
      }

      return NextResponse.json(
        {
          error:
            parsed?.error ??
            parsed?.message ??
            `Vector store query failed: ${response.status} ${response.statusText}`,
          details: parsed ?? errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Vector store query request failed:', error);
    return NextResponse.json(
      {
        error: 'Unable to query the vector store.',
        details: error.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}


