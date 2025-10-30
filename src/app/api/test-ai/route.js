import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    console.log('🧪 Test AI endpoint called')
    
    // For now, just return mock data to test the Sanity integration
    const mockResponse = {
      success: true,
      message: 'Mock AI service call for testing',
      aiResponse: {
        description: "This is a mock description generated for testing. The image shows a test artwork with various visual elements and composition.",
        mood_tags: ["Mock", "Test", "Demo", "Artistic"]
      },
      fileInfo: {
        name: "test-image.jpg",
        size: 12345,
        type: "image/jpeg"
      }
    }
    
    console.log('✅ Returning mock response:', mockResponse)
    return NextResponse.json(mockResponse)

  } catch (error) {
    console.error('💥 Test endpoint error:', error)
    return NextResponse.json(
      { 
        error: 'Test endpoint failed',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// Also add a GET endpoint for testing without file upload
export async function GET() {
  return NextResponse.json({
    message: 'Test AI endpoint is working',
    instructions: 'Send a POST request with a file to test the AI service',
    requiredHeaders: {
      'Content-Type': 'multipart/form-data'
    },
    requiredBody: {
      file: 'Image file (JPEG, PNG, WebP, or non-animated GIF)'
    }
  })
}
