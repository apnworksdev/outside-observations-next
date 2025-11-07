/**
 * Next.js API Route: /api/generate-metadata
 * 
 * This route acts as a secure proxy between the Sanity Studio client component
 * and the external AI service. It handles:
 * 
 * 1. Server-side API key management (keeps key out of client-side code)
 * 2. FormData forwarding (converts File to Blob for Node.js compatibility)
 * 3. Error handling and response formatting
 * 
 * Why a proxy route?
 * - API keys should never be exposed to the client
 * - Sanity Studio components run client-side in the browser
 * - This route runs server-side where environment variables are safe
 */
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    // Get API key from server-side environment variable
    // Never use NEXT_PUBLIC_ prefix here - we want this to be server-only
    const apiKey = process.env.OUTSIDE_OBSERVATIONS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is not configured on the server. Please set OUTSIDE_OBSERVATIONS_API_KEY in your environment variables.' },
        { status: 500 }
      )
    }

    // Parse incoming FormData from the client
    const incomingFormData = await request.formData()
    const imageFile = incomingFormData.get('image')
    
    if (!imageFile || !(imageFile instanceof File)) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      )
    }
    
    // Convert File to Blob for Node.js compatibility
    // Next.js receives File objects, but Node.js fetch needs Blobs for FormData
    const arrayBuffer = await imageFile.arrayBuffer()
    const blob = new Blob([arrayBuffer], { type: imageFile.type })
    
    // Reconstruct FormData with Blob (required for Node.js fetch)
    const formData = new FormData()
    formData.append('image', blob, imageFile.name)
    
    // Forward request to external AI service
    // The service expects:
    // - Method: POST
    // - Header: X-API-Key with authentication token
    // - Body: multipart/form-data with 'image' field
    const aiServiceUrl = 'https://outside-observations-ai-398532801393.us-central1.run.app/api/generate-metadata'
    
    const response = await fetch(aiServiceUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey
        // Don't set Content-Type header - fetch will automatically set it
        // with the correct boundary for multipart/form-data
      },
      body: formData
    })

    // Handle errors from AI service
    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        return NextResponse.json(
          { error: `AI service error: ${response.status} - ${errorText}` },
          { status: response.status }
        )
      }
      return NextResponse.json(
        { error: errorData.error || errorData.message || `AI service error: ${response.status}` },
        { status: response.status }
      )
    }

    // Success - return AI service response as-is
    // Response format: { description: string, mood_tags: string[] }
    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    // Handle network errors, parsing errors, etc.
    console.error('Error proxying AI service request:', error)
    return NextResponse.json(
      { 
        error: 'Failed to connect to AI service', 
        details: error.message
      },
      { status: 500 }
    )
  }
}

