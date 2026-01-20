/**
 * Next.js API Route: /api/vector-store/update-item
 *
 * Proxies update requests to the external vector store service. Use this when an
 * item (by id) already exists and the description has changed (e.g. re-publish
 * after editing). The backend must implement /api/vector_store/update_item.
 *
 * Request: POST with JSON { id, description }
 */
import { NextResponse } from 'next/server'

const VECTOR_STORE_PATH = '/api/vector_store/update_item'

function buildApiUrl(path) {
  const baseUrl = process.env.OUTSIDE_OBSERVATIONS_API_BASE_URL
  if (!baseUrl) {
    throw new Error('OUTSIDE_OBSERVATIONS_API_BASE_URL is not configured')
  }
  const cleanBase = baseUrl.replace(/\/+$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${cleanBase}${cleanPath}`
}

export async function POST(request) {
  try {
    const apiKey = process.env.OUTSIDE_OBSERVATIONS_API_KEY
    const baseUrl = process.env.OUTSIDE_OBSERVATIONS_API_BASE_URL

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is not configured. Set OUTSIDE_OBSERVATIONS_API_KEY.' },
        { status: 500 }
      )
    }
    if (!baseUrl) {
      return NextResponse.json(
        { error: 'API base URL is not configured. Set OUTSIDE_OBSERVATIONS_API_BASE_URL.' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { id, description } = body

    if (!id || !description) {
      return NextResponse.json(
        { error: 'Both id and description are required' },
        { status: 400 }
      )
    }

    const url = buildApiUrl(VECTOR_STORE_PATH)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ id, description }),
    })

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

    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error proxying vector store update:', error)
    return NextResponse.json(
      { error: 'Failed to connect to vector store service', details: error.message },
      { status: 500 }
    )
  }
}
