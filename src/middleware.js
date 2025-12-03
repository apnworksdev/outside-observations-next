import { NextResponse } from 'next/server'

export function middleware(request) {
  const pathname = request.nextUrl.pathname

  // Redirect all URLs except home to home
  if (pathname !== '/') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Set headers for home page
  const response = NextResponse.next()
  response.headers.set('x-page-type', 'home')
  response.headers.set('x-pathname', pathname)
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
