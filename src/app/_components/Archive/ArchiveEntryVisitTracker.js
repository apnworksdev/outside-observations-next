'use client';

import { useEffect } from 'react';
import { markEntryAsVisited } from '@/app/_helpers/archiveVisitedStorage';

/**
 * Marks an archive entry as visited when the component mounts.
 * Used in archive entry pages to track visits.
 */
export default function ArchiveEntryVisitTracker({ slug }) {
  useEffect(() => {
    if (slug) markEntryAsVisited(slug);
  }, [slug]);
  return null;
}
