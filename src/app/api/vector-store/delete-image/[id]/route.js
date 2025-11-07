/**
 * Next.js API Route: /api/vector-store/delete-image/[id]
 * 
 * This route acts as a secure proxy to delete an image from the vector store.
 * Keeps the API key server-side.
 */
import { NextResponse } from 'next/server'

export async function DELETE(request, { params }) {
  try {
    // Get API key from server-side environment variable
    const apiKey = process.env.OUTSIDE_OBSERVATIONS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is not configured on the server. Please set OUTSIDE_OBSERVATIONS_API_KEY in your environment variables.' },
        { status: 500 }
      )
    }

    // Get image ID from route parameters
    const { id } = params
    if (!id) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      )
    }

    // Forward request to external vector store service
    const vectorStoreUrl = `https://outside-observations-ai-398532801393.us-central1.run.app/api/vector_store/delete_one_image/${encodeURIComponent(id)}`
    
    const response = await fetch(vectorStoreUrl, {
      method: 'DELETE',
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
    console.error('Error proxying vector store delete request:', error)
    return NextResponse.json(
      { 
        error: 'Failed to connect to vector store service', 
        details: error.message
      },
      { status: 500 }
    )
  }
}

