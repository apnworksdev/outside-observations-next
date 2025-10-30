// Pure helper to map a pathname to a page type. Safe for server, edge, and client.
export function resolvePageType(pathname) {
  if (!pathname) return 'home'
  if (pathname.startsWith('/archive/entry')) return 'archive-entry'
  if (pathname.startsWith('/archive')) return 'archive'
  if (pathname.startsWith('/lab')) return 'lab'
  if (pathname.startsWith('/radio')) return 'radio'
  return 'home'
}

