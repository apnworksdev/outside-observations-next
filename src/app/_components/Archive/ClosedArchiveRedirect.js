'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isInClosedHours } from '@/lib/closedArchiveHours';

/**
 * When using local time: redirects archive pages to /archive/closed when closed,
 * and /archive/closed to /archive when open.
 * Always renders the same wrapper + children (no null) so server and client match.
 * When a redirect is pending we hide content with CSS so the user never sees a flash.
 */
export default function ClosedArchiveRedirect({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !pathname.startsWith('/archive')) return;
    const closed = isInClosedHours();
    if (pathname === '/archive/closed') {
      if (!closed) router.replace('/archive');
    } else if (closed) {
      router.replace('/archive/closed');
    }
  }, [mounted, pathname, router]);

  const closed = mounted && pathname.startsWith('/archive') ? isInClosedHours() : false;
  const shouldRedirect =
    pathname === '/archive/closed' ? !closed : pathname.startsWith('/archive') && closed;

  return (
    <div
      style={
        shouldRedirect
          ? {
              visibility: 'hidden',
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
