'use client';

import { useEffect, useRef } from 'react';
import { trackArchiveClosedView } from '@/app/_helpers/gtag';

/**
 * Fires archive_closed_view once when the archive closed / countdown page is viewed.
 */
export default function ArchiveClosedViewTracker() {
  const sentRef = useRef(false);

  useEffect(() => {
    if (!sentRef.current) {
      sentRef.current = true;
      trackArchiveClosedView();
    }
  }, []);

  return null;
}
