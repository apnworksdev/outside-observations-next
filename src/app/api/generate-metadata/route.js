/**
 * Next.js API Route: /api/generate-metadata
 * 
 * This route acts as a secure proxy between the Sanity Studio client component
 * and the external AI service. It implements a 3-step signed URL flow to support
 * large file uploads (up to 512MB) for both images and videos:
 * 
 * 1. Server-side API key management (keeps key out of client-side code)
 * 2. Get signed upload URL from the AI service
 * 3. Upload file directly to Google Cloud Storage (bypasses Cloud Run 32MB limit)
 * 4. Generate metadata from the uploaded file
 * 5. Error handling and response formatting
 * 
 * Why a proxy route?
 * - API keys should never be exposed to the client
 * - Sanity Studio components run client-side in the browser
 * - This route runs server-side where environment variables are safe
 * 
 * The 3-step flow:
 * - Step 1: GET /api/get-upload-url?filename=...&contentType=...
 * - Step 2: PUT to signed URL with file content
 * - Step 3: POST /api/generate-metadata-from-gcs with { objectName }
 */
import { NextResponse } from 'next/server'

const GET_UPLOAD_URL_PATH = '/api/get-upload-url';
const GENERATE_METADATA_FROM_GCS_PATH = '/api/generate-metadata-from-gcs';

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

// Helper function to send progress update
function sendProgress(controller, message) {
  const progress = JSON.stringify({ type: 'progress', message }) + '\n'
  controller.enqueue(new TextEncoder().encode(progress))
}

// Helper function to send final result
function sendResult(controller, data) {
  const result = JSON.stringify({ type: 'result', data }) + '\n'
  controller.enqueue(new TextEncoder().encode(result))
}

// Helper function to send error
function sendError(controller, error) {
  const errorMsg = JSON.stringify({ type: 'error', error }) + '\n'
  controller.enqueue(new TextEncoder().encode(errorMsg))
}

export async function POST(request) {
  const stream = new ReadableStream({
    async start(controller) {
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
          sendError(controller, 'API key is not configured on the server. Please set OUTSIDE_OBSERVATIONS_API_KEY in your environment variables.')
          controller.close()
          return
        }

        if (!baseUrl) {
          console.error('[generate-metadata] Base URL is missing')
          sendError(controller, 'API base URL is not configured on the server. Please set OUTSIDE_OBSERVATIONS_API_BASE_URL in your environment variables.')
          controller.close()
          return
        }

        // Parse incoming FormData from the client
        console.log('[generate-metadata] Parsing FormData...')
        const incomingFormData = await request.formData()
        const mediaFile = incomingFormData.get('file')
        
        console.log('[generate-metadata] File received:', {
          hasFile: !!mediaFile,
          type: mediaFile ? typeof mediaFile : 'none',
          isFile: mediaFile instanceof File,
          isBlob: mediaFile instanceof Blob,
          size: mediaFile?.size,
          name: mediaFile?.name
        })
        
        if (!mediaFile) {
          console.error('[generate-metadata] No file in FormData')
          sendError(controller, 'No file provided in FormData')
          controller.close()
          return
        }
        
        // In Next.js App Router, FormData.get() returns File or Blob
        // Check if it's a File or Blob (both work for our purposes)
        if (!(mediaFile instanceof File) && !(mediaFile instanceof Blob)) {
          console.error('[generate-metadata] Invalid file type:', typeof mediaFile)
          sendError(controller, `Invalid file type. Expected File or Blob, got: ${typeof mediaFile}`)
          controller.close()
          return
        }
        
        // Get file metadata
        const mimeType = mediaFile.type || 'application/octet-stream'
        const fileSize = mediaFile.size || 0
        let filename = mediaFile instanceof File ? mediaFile.name : 'media-file'
        
        // Ensure filename has correct extension matching MIME type
        if (mimeType.startsWith('video/') && !filename.match(/\.(mp4|mov|avi|webm|mkv)$/i)) {
          const extension = mimeType.split('/')[1]?.split(';')[0] || 'mp4'
          filename = `${filename}.${extension}`
        } else if (mimeType.startsWith('image/') && !filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          const extension = mimeType.split('/')[1]?.split(';')[0] || 'jpg'
          filename = `${filename}.${extension}`
        }
        
        console.log('[generate-metadata] File info:', {
          filename,
          mimeType,
          size: fileSize,
          sizeMB: (fileSize / (1024 * 1024)).toFixed(2)
        })

        // Step 1: Get signed upload URL
        sendProgress(controller, 'Step 1/3: Getting upload URL...')
        console.log('[generate-metadata] Step 1: Getting signed upload URL...')
        const getUploadUrl = buildApiUrl(
          `${GET_UPLOAD_URL_PATH}?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(mimeType)}`
        )
        
        let urlResponse
        try {
          urlResponse = await fetch(getUploadUrl, {
            method: 'GET',
            headers: {
              'X-API-Key': apiKey
            }
          })
          console.log('[generate-metadata] Upload URL response status:', urlResponse.status)
        } catch (fetchError) {
          console.error('[generate-metadata] Error getting upload URL:', fetchError)
          sendError(controller, `Failed to get upload URL: ${fetchError.message}`)
          controller.close()
          return
        }

        if (!urlResponse.ok) {
          const errorText = await urlResponse.text()
          console.error('[generate-metadata] Upload URL error response:', errorText)
          let errorData
          try {
            errorData = JSON.parse(errorText)
          } catch {
            errorData = { error: errorText }
          }
          sendError(controller, errorData.error || errorData.message || `Failed to get upload URL: ${urlResponse.status}`)
          controller.close()
          return
        }

        const { uploadUrl, objectName } = await urlResponse.json()
        if (!uploadUrl || !objectName) {
          console.error('[generate-metadata] Invalid upload URL response:', { uploadUrl, objectName })
          sendError(controller, 'Invalid response from upload URL endpoint. Missing uploadUrl or objectName.')
          controller.close()
          return
        }

        console.log('[generate-metadata] Got signed URL, objectName:', objectName)
        sendProgress(controller, 'Step 2/3: Uploading file to cloud storage...')

        // Step 2: Upload file directly to Google Cloud Storage
        console.log('[generate-metadata] Step 2: Uploading file to GCS...')
        const arrayBuffer = await mediaFile.arrayBuffer()
        const blob = new Blob([arrayBuffer], { type: mimeType })
        
        let uploadResponse
        try {
          uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': mimeType
            },
            body: blob
          })
          console.log('[generate-metadata] GCS upload response status:', uploadResponse.status)
        } catch (uploadError) {
          console.error('[generate-metadata] Error uploading to GCS:', uploadError)
          sendError(controller, `Failed to upload file to GCS: ${uploadError.message}`)
          controller.close()
          return
        }

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text()
          console.error('[generate-metadata] GCS upload error:', errorText)
          sendError(controller, `Failed to upload file to GCS: ${uploadResponse.status}`)
          controller.close()
          return
        }

        console.log('[generate-metadata] File uploaded successfully to GCS')
        sendProgress(controller, 'Step 3/3: Generating AI metadata...')

        // Step 3: Generate metadata from the uploaded file
        console.log('[generate-metadata] Step 3: Generating metadata from GCS file...')
        const generateMetadataUrl = buildApiUrl(GENERATE_METADATA_FROM_GCS_PATH)
        
        let metadataResponse
        try {
          metadataResponse = await fetch(generateMetadataUrl, {
            method: 'POST',
            headers: {
              'X-API-Key': apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ objectName })
          })
          console.log('[generate-metadata] Metadata generation response status:', metadataResponse.status)
        } catch (fetchError) {
          console.error('[generate-metadata] Error generating metadata:', fetchError)
          sendError(controller, `Failed to generate metadata: ${fetchError.message}`)
          controller.close()
          return
        }

        // Handle errors from metadata generation
        if (!metadataResponse.ok) {
          console.error('[generate-metadata] Metadata generation returned error status:', metadataResponse.status)
          const errorText = await metadataResponse.text()
          console.error('[generate-metadata] Metadata generation error response:', errorText)
          
          let errorData
          try {
            errorData = JSON.parse(errorText)
            console.error('[generate-metadata] Parsed error data:', errorData)
          } catch (parseError) {
            console.error('[generate-metadata] Failed to parse error response as JSON:', parseError)
            sendError(controller, `Metadata generation error: ${metadataResponse.status}`)
            controller.close()
            return
          }
          
          sendError(controller, errorData.error || errorData.message || `Metadata generation error: ${metadataResponse.status}`)
          controller.close()
          return
        }

        // Success - return metadata response as-is
        // Response format: { description: string, mood_tags: string[] }
        const data = await metadataResponse.json()
        console.log('[generate-metadata] Metadata generated successfully')
        sendResult(controller, data)
        controller.close()

      } catch (error) {
        // Handle network errors, parsing errors, etc.
        console.error('[generate-metadata] Error proxying AI service request:', error)
        console.error('[generate-metadata] Error stack:', error.stack)
        console.error('[generate-metadata] Error name:', error.name)
        console.error('[generate-metadata] Error message:', error.message)
        
        sendError(controller, `Failed to connect to AI service: ${error.message}`)
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

