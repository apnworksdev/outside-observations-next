import { NextResponse } from 'next/server'
import { resolvePageType } from '@/lib/resolvePageType'

export function middleware(request) {
  const pathname = request.nextUrl.pathname

  // Redirect all URLs except home to home (including studio)
  if (pathname !== '/') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Original middleware logic - commented out
  // const pageType = resolvePageType(pathname)
  // const response = NextResponse.next()
  // response.headers.set('x-page-type', pageType)
  // response.headers.set('x-pathname', pathname)
  // return response

  // For home page, still set headers but use home as page type
  const pageType = 'home'
  const response = NextResponse.next()
  response.headers.set('x-page-type', pageType)
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
