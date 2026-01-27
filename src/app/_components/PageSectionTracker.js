'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageSection } from '@/app/_helpers/gtag';

/**
 * Sends page_section (and entry_point on first hit of session) to GA4 on every route change.
 * Enables "entry point" and "time by section" reporting in GA4 Explorations.
 */
export default function PageSectionTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // pathname can be null on initial render before hydration
    if (pathname) {
      trackPageSection(pathname);
    }
  }, [pathname]);

  return null;
}
