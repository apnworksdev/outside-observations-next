/**
 * Next.js API Route: /api/vector-store/get-all-images
 * 
 * This route acts as a secure proxy to get all images from the vector store.
 * Keeps the API key server-side.
 */
import { NextResponse } from 'next/server'

const VECTOR_STORE_PATH = '/api/vector_store/get_all_images';

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

export async function GET() {
  try {
    // Get API key from server-side environment variable
    const apiKey = process.env.OUTSIDE_OBSERVATIONS_API_KEY
    const baseUrl = process.env.OUTSIDE_OBSERVATIONS_API_BASE_URL
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is not configured on the server. Please set OUTSIDE_OBSERVATIONS_API_KEY in your environment variables.' },
        { status: 500 }
      )
    }

    if (!baseUrl) {
      return NextResponse.json(
        { error: 'API base URL is not configured on the server. Please set OUTSIDE_OBSERVATIONS_API_BASE_URL in your environment variables.' },
        { status: 500 }
      )
    }

    // Forward request to external vector store service
    const vectorStoreUrl = buildApiUrl(VECTOR_STORE_PATH);
    const response = await fetch(vectorStoreUrl, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey
      }
    })

    // Handle errors from vector store service
    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        return NextResponse.json(
          { error: `Vector store error: ${response.status} - ${errorText}` },
          { status: response.status }
        )
      }
      return NextResponse.json(
        { error: errorData.error || errorData.message || `Vector store error: ${response.status}` },
        { status: response.status }
      )
    }

    // Success - return vector store response as-is
    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    // Handle network errors, parsing errors, etc.
    console.error('Error proxying vector store request:', error)
    return NextResponse.json(
      { 
        error: 'Failed to connect to vector store service', 
        details: error.message
      },
      { status: 500 }
    )
  }
}

