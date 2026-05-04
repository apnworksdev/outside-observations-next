'use client';

import { useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Hook to prefetch a route after hovering for a specified delay
 * @param {string} href - The route to prefetch
 * @param {number} delay - Delay in milliseconds before prefetching (default: 300)
 * @returns {object} - Object with onMouseEnter and onMouseLeave handlers
 */
export function usePrefetchOnHover(href, delay = 300) {
  const router = useRouter();
  const timeoutRef = useRef(null);
  const hasPrefetchedRef = useRef(false);

  const handleMouseEnter = useCallback(() => {
    // Don't prefetch if already prefetched
    if (hasPrefetchedRef.current || !href) {
      return;
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set timeout to prefetch after delay
    timeoutRef.current = setTimeout(() => {
      // Basic-auth route: prefetch would 401 and can surface the browser login UI on the current page.
      if (href && href.startsWith('/archive/widline-cadet')) {
        return;
      }
      if (href) {
        router.prefetch(href);
        hasPrefetchedRef.current = true;
      }
    }, delay);
  }, [href, delay, router]);

  const handleMouseLeave = useCallback(() => {
    // Clear timeout if user moves mouse away before delay
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  };
}

