'use client';

import { useState, useEffect } from 'react';
import { isEntryVisited } from '@/app/_helpers/archiveVisitedStorage';

/**
 * Custom hook to check if an archive entry has been visited
 * 
 * Handles hydration safely by:
 * - Starting with false (matches server render)
 * - Checking localStorage after mount in useEffect
 * - Prevents hydration mismatches
 * 
 * @param {string|null} slug - Entry slug to check
 * @returns {boolean} True if entry has been visited
 */
export function useArchiveEntryVisited(slug) {
  // Start with false to match server render (no hydration mismatch)
  const [isVisited, setIsVisited] = useState(false);

  useEffect(() => {
    // Only check localStorage after mount (client-side only)
    if (slug && typeof slug === 'string') {
      const visited = isEntryVisited(slug);
      setIsVisited(visited);
    } else {
      setIsVisited(false);
    }
  }, [slug]);

  return isVisited;
}
