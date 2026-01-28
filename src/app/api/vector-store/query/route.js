import { NextResponse } from 'next/server';

const VECTOR_STORE_PATH = '/api/vector_store/query';

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
  /**
   * This route proxies search requests to the vector store while hiding credentials.
   * Responsibilities:
   *   - Validate presence of the shared API key.
   *   - Guard against malformed payloads (non-string queries).
   *   - Forward the request with query and maxItems parameters.
   *   - Normalise upstream failures into structured JSON responses so the client can
   *     render friendly fallbacks without exposing implementation details.
   */
  try {
    const apiKey = process.env.OUTSIDE_OBSERVATIONS_API_KEY;
    const baseUrl = process.env.OUTSIDE_OBSERVATIONS_API_BASE_URL;
    
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Vector store API key is not configured. Please set OUTSIDE_OBSERVATIONS_API_KEY in your environment variables.',
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

    const vectorStoreQueryUrl = buildApiUrl(VECTOR_STORE_PATH);

    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected JSON.' },
        { status: 400 }
      );
    }

    const { query, maxItems = 10 } = requestBody;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'A search query is required and must be a string.' },
        { status: 400 }
      );
    }

    const response = await fetch(vectorStoreQueryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        query,
        maxItems,
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


