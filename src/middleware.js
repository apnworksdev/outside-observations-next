import { NextResponse } from 'next/server'
import { resolvePageType } from '@/lib/resolvePageType'
import { useTimezoneRedirect, isInClosedHours } from '@/lib/closedArchiveHours'

export function middleware(request) {
  const pathname = request.nextUrl.pathname

  // Closed archive: redirect by open/closed window (only when useTimezoneRedirect)
  if (useTimezoneRedirect && pathname.startsWith('/archive')) {
    const closed = isInClosedHours()
    if (pathname === '/archive/closed') {
      if (!closed) return NextResponse.redirect(new URL('/archive', request.url))
    } else if (closed) {
      return NextResponse.redirect(new URL('/archive/closed', request.url))
    }
  }

  // Redirect /studio to Archive entries list
  if (pathname === '/studio' || pathname === '/studio/structure') {
    return NextResponse.redirect(new URL('/studio/structure/archive', request.url))
  }

  // Block vector-store page on deployed environments (only allow on localhost)
  if (pathname.startsWith('/vector-store')) {
    const hostname = request.headers.get('host') || ''
    const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1')
    
    if (!isLocalhost) {
      return NextResponse.redirect(new URL('/archive', request.url))
    }
  }

  // Password protection - only active if SITE_PASSWORD is set
  const sitePassword = process.env.SITE_PASSWORD
  const siteUsername = process.env.SITE_USERNAME || 'admin' // Default username

  if (sitePassword) {
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Protected Site"',
        },
      })
    }

    // Decode the base64 credentials (using atob for Edge runtime compatibility)
    const base64Credentials = authHeader.split(' ')[1]
    const credentials = atob(base64Credentials)
    const [username, password] = credentials.split(':')

    // Verify credentials
    if (username !== siteUsername || password !== sitePassword) {
      return new NextResponse('Invalid credentials', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Protected Site"',
        },
      })
    }
  }

  const pageType = resolvePageType(pathname)
  const response = NextResponse.next()
  response.headers.set('x-page-type', pageType)
  response.headers.set('x-pathname', pathname)
  // Returning visitor is resolved client-side from localStorage (see HomeContent)
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
