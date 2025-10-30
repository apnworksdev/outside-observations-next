import { NextResponse } from 'next/server'

export function middleware(request) {
  const pathname = request.nextUrl.pathname
  const pageType = pathname.startsWith('/archive') ? 'archive' : 
                   pathname.startsWith('/lab') ? 'lab' : 
                   pathname.startsWith('/radio') ? 'radio' : 'home'
  
  const response = NextResponse.next()
  response.headers.set('x-page-type', pageType)
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
