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

const AI_SERVICE_PATH = '/api/generate-metadata';

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
    console.log('[generate-metadata] Request received')
    
    // Get API key from server-side environment variable
    // Never use NEXT_PUBLIC_ prefix here - we want this to be server-only
    const apiKey = process.env.OUTSIDE_OBSERVATIONS_API_KEY
    const baseUrl = process.env.OUTSIDE_OBSERVATIONS_API_BASE_URL
    
    console.log('[generate-metadata] API Key present:', !!apiKey)
    console.log('[generate-metadata] Base URL:', baseUrl ? `${baseUrl.substring(0, 20)}...` : 'NOT SET')
    
    if (!apiKey) {
      console.error('[generate-metadata] API key is missing')
      return NextResponse.json(
        { error: 'API key is not configured on the server. Please set OUTSIDE_OBSERVATIONS_API_KEY in your environment variables.' },
        { status: 500 }
      )
    }

    if (!baseUrl) {
      console.error('[generate-metadata] Base URL is missing')
      return NextResponse.json(
        { error: 'API base URL is not configured on the server. Please set OUTSIDE_OBSERVATIONS_API_BASE_URL in your environment variables.' },
        { status: 500 }
      )
    }

    const aiServiceUrl = buildApiUrl(AI_SERVICE_PATH);
    console.log('[generate-metadata] AI Service URL:', aiServiceUrl)

    // Parse incoming FormData from the client
    console.log('[generate-metadata] Parsing FormData...')
    const incomingFormData = await request.formData()
    const imageFile = incomingFormData.get('image')
    
    console.log('[generate-metadata] File received:', {
      hasFile: !!imageFile,
      type: imageFile ? typeof imageFile : 'none',
      isFile: imageFile instanceof File,
      isBlob: imageFile instanceof Blob,
      size: imageFile?.size,
      name: imageFile?.name
    })
    
    if (!imageFile) {
      console.error('[generate-metadata] No file in FormData')
      return NextResponse.json(
        { error: 'No image file provided in FormData' },
        { status: 400 }
      )
    }
    
    // In Next.js App Router, FormData.get() returns File or Blob
    // Check if it's a File or Blob (both work for our purposes)
    if (!(imageFile instanceof File) && !(imageFile instanceof Blob)) {
      console.error('[generate-metadata] Invalid file type:', typeof imageFile)
      return NextResponse.json(
        { error: `Invalid file type. Expected File or Blob, got: ${typeof imageFile}` },
        { status: 400 }
      )
    }
    
    // Convert File/Blob to Blob for Node.js compatibility
    // Next.js receives File objects, but Node.js fetch needs Blobs for FormData
    console.log('[generate-metadata] Converting file to blob...')
    const arrayBuffer = await imageFile.arrayBuffer()
    
    // Preserve the original MIME type - this is crucial for the AI service to detect file type
    const mimeType = imageFile.type || 'application/octet-stream'
    const blob = new Blob([arrayBuffer], { type: mimeType })
    
    // Get filename - File has .name, Blob might not
    // Ensure filename has correct extension matching MIME type for better detection
    let filename = imageFile instanceof File ? imageFile.name : 'media-file'
    
    // If filename doesn't have an extension matching the MIME type, add one
    // This helps the AI service detect the file type correctly
    if (mimeType.startsWith('video/') && !filename.match(/\.(mp4|mov|avi|webm|mkv)$/i)) {
      const extension = mimeType.split('/')[1]?.split(';')[0] || 'mp4'
      filename = `${filename}.${extension}`
    } else if (mimeType.startsWith('image/') && !filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      const extension = mimeType.split('/')[1]?.split(';')[0] || 'jpg'
      filename = `${filename}.${extension}`
    }
    
    console.log('[generate-metadata] Blob created:', {
      size: blob.size,
      type: blob.type,
      filename
    })
    
    // Reconstruct FormData with Blob (required for Node.js fetch)
    const formData = new FormData()
    // Ensure we preserve the MIME type by explicitly setting it
    // The third parameter (filename) helps preserve the file extension which aids in type detection
    formData.append('image', blob, filename)
    
    // Log what we're sending to help debug
    console.log('[generate-metadata] FormData prepared:', {
      fieldName: 'image',
      blobType: blob.type,
      blobSize: blob.size,
      filename: filename,
      hasCorrectExtension: filename.endsWith('.mp4') || filename.endsWith('.mov') || filename.endsWith('.avi') || filename.endsWith('.webm')
    })
    
    // Forward request to external AI service
    // The service expects:
    // - Method: POST
    // - Header: X-API-Key with authentication token
    // - Body: multipart/form-data with 'image' field
    // The service should auto-detect file type from MIME type and/or file extension
    console.log('[generate-metadata] Calling AI service...')
    let response
    try {
      response = await fetch(aiServiceUrl, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey
          // Don't set Content-Type header - fetch will automatically set it
          // with the correct boundary for multipart/form-data
        },
        body: formData
      })
      console.log('[generate-metadata] AI service response status:', response.status)
    } catch (fetchError) {
      console.error('[generate-metadata] Fetch error calling AI service:', fetchError)
      console.error('[generate-metadata] AI Service URL:', aiServiceUrl)
      console.error('[generate-metadata] Error details:', {
        message: fetchError.message,
        stack: fetchError.stack,
        cause: fetchError.cause
      })
      throw new Error(`Failed to call AI service: ${fetchError.message}`)
    }

    // Handle errors from AI service
    if (!response.ok) {
      console.error('[generate-metadata] AI service returned error status:', response.status)
      const errorText = await response.text()
      console.error('[generate-metadata] AI service error response:', errorText)
      
      let errorData
      try {
        errorData = JSON.parse(errorText)
        console.error('[generate-metadata] Parsed error data:', errorData)
      } catch (parseError) {
        console.error('[generate-metadata] Failed to parse error response as JSON:', parseError)
        return NextResponse.json(
          { 
            error: `AI service error: ${response.status}`,
            details: errorText.substring(0, 500), // Limit error text length
            status: response.status
          },
          { status: response.status }
        )
      }
      
      return NextResponse.json(
        { 
          error: errorData.error || errorData.message || `AI service error: ${response.status}`,
          details: errorData.details || errorData.stack || errorText.substring(0, 500),
          status: response.status
        },
        { status: response.status }
      )
    }

    // Success - return AI service response as-is
    // Response format: { description: string, mood_tags: string[] }
    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    // Handle network errors, parsing errors, etc.
    console.error('[generate-metadata] Error proxying AI service request:', error)
    console.error('[generate-metadata] Error stack:', error.stack)
    console.error('[generate-metadata] Error name:', error.name)
    console.error('[generate-metadata] Error message:', error.message)
    
    return NextResponse.json(
      { 
        error: 'Failed to connect to AI service', 
        details: error.message,
        errorType: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

