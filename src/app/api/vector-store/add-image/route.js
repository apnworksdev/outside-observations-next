/**
 * Next.js API Route: /api/vector-store/add-image
 * 
 * This route acts as a secure proxy between the Sanity Studio client component
 * and the external vector store service. It handles:
 * 
 * 1. Server-side API key management (keeps key out of client-side code)
 * 2. Request formatting for the vector store API
 * 3. Error handling and response formatting
 */
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    // Get API key from server-side environment variable
    const apiKey = process.env.OUTSIDE_OBSERVATIONS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is not configured on the server. Please set OUTSIDE_OBSERVATIONS_API_KEY in your environment variables.' },
        { status: 500 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { id, description } = body

    if (!id || !description) {
      return NextResponse.json(
        { error: 'Both id and description are required' },
        { status: 400 }
      )
    }

    // Forward request to external vector store service
    const vectorStoreUrl = 'https://outside-observations-ai-398532801393.us-central1.run.app/api/vector_store/add_new_image'
    
    const response = await fetch(vectorStoreUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        id: id,
        description: description
      })
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

