import { NextResponse } from 'next/server'
import { resolvePageType } from '@/lib/resolvePageType'

export function middleware(request) {
  const pathname = request.nextUrl.pathname
  const pageType = resolvePageType(pathname)

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
