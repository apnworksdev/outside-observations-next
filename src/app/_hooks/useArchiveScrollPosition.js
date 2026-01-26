'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export const ARCHIVE_SCROLL_PERCENTAGE_KEY = 'archive_scroll_percentage';
export const ARCHIVE_SCROLL_VIEW_KEY = 'archive_scroll_view';

// Cache scroll element references to avoid repeated DOM queries
const scrollElementCache = { list: null, images: null };

/**
 * Gets the scroll element for a given view (with caching)
 * @param {string} view - The current view ('list' or 'images')
 * @returns {HTMLElement|null} The scroll element or null
 */
function getScrollElement(view) {
  if (view === 'list') {
    if (!scrollElementCache.list) {
      scrollElementCache.list = document.querySelector('scroll-container');
    }
    return scrollElementCache.list;
  } else {
    if (!scrollElementCache.images) {
      scrollElementCache.images = document.querySelector('mask-scroll');
      // Fallback: try container if not found
      if (!scrollElementCache.images) {
        const container = document.querySelector('[data-view="images"]');
        if (container) {
          scrollElementCache.images = container.querySelector('mask-scroll');
        }
      }
    }
    return scrollElementCache.images;
  }
}

/**
 * Clears the scroll element cache (call when view changes)
 */
export function clearScrollElementCache() {
  scrollElementCache.list = null;
  scrollElementCache.images = null;
}

/**
 * Saves the current scroll position of the archive page as a percentage
 * Uses percentage for cross-view restoration (works for both same and different views)
 * Optimized with element caching and minimal DOM queries
 * @param {string} view - The current view ('list' or 'images')
 */
export function saveArchiveScrollPosition(view) {
  if (typeof window === 'undefined') return;

  try {
    let scrollPercentage = 0;
    let scrollElement = null;
    let scrollHeight = 0;
    let clientHeight = 0;
    let maxScroll = 0;

    // Use cached element reference (avoids repeated DOM queries)
    scrollElement = getScrollElement(view);

    if (scrollElement) {
      const scrollPosition = scrollElement.scrollTop;
      scrollHeight = scrollElement.scrollHeight;
      clientHeight = scrollElement.clientHeight;
      maxScroll = scrollHeight - clientHeight;
      // Calculate percentage: 0 = top, 1 = bottom
      scrollPercentage = maxScroll > 0 ? scrollPosition / maxScroll : 0;
    } else if (view === 'images') {
      // Last resort: use window scroll if mask-scroll not found
      const scrollPosition = window.scrollY || window.pageYOffset || 0;
      scrollHeight = document.documentElement.scrollHeight;
      clientHeight = window.innerHeight;
      maxScroll = scrollHeight - clientHeight;
      scrollPercentage = maxScroll > 0 ? scrollPosition / maxScroll : 0;
    }

    sessionStorage.setItem(ARCHIVE_SCROLL_PERCENTAGE_KEY, String(scrollPercentage));
    sessionStorage.setItem(ARCHIVE_SCROLL_VIEW_KEY, view);
  } catch (error) {
    // Silently fail if sessionStorage is unavailable
  }
}

/**
 * Restores the saved scroll position of the archive page using percentage
 * Works for both same view and cross-view restoration
 * @param {string} currentView - The current view ('list' or 'images')
 * @param {Function} onRestore - Optional callback after restoration
 */
export function restoreArchiveScrollPosition(currentView, onRestore) {
  if (typeof window === 'undefined') return;

  try {
    const savedPercentage = sessionStorage.getItem(ARCHIVE_SCROLL_PERCENTAGE_KEY);
    const savedView = sessionStorage.getItem(ARCHIVE_SCROLL_VIEW_KEY);

    if (!savedView || !savedPercentage) {
      return;
    }

    // Use requestAnimationFrame to ensure DOM is ready, especially for custom elements
    requestAnimationFrame(() => {
      let restored = false;
      let scrollElement = null;

      // Cache DOM query - only query once
      if (currentView === 'list') {
        scrollElement = document.querySelector('scroll-container');
      } else {
        scrollElement = document.querySelector('mask-scroll');
      }

      if (scrollElement) {
        const scrollHeight = scrollElement.scrollHeight;
        const clientHeight = scrollElement.clientHeight;
        const maxScroll = scrollHeight - clientHeight;

        if (maxScroll > 0) {
          const percentage = parseFloat(savedPercentage);
          if (!isNaN(percentage) && percentage >= 0 && percentage <= 1) {
            const newPosition = percentage * maxScroll;
            scrollElement.scrollTop = newPosition;
            restored = true;
          }
        }
      } else if (currentView === 'images') {
        // Fallback to window scroll if mask-scroll not found (only for images view)
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = window.innerHeight;
        const maxScroll = scrollHeight - clientHeight;

        if (maxScroll > 0) {
          const percentage = parseFloat(savedPercentage);
          if (!isNaN(percentage) && percentage >= 0 && percentage <= 1) {
            const newPosition = percentage * maxScroll;
            window.scrollTo(0, newPosition);
            restored = true;
          }
        }
      }

      if (restored && onRestore) {
        onRestore();
      }
    });
  } catch (error) {
    // Silently fail if restore fails
  }
}

/**
 * Clears the saved scroll position
 */
export function clearArchiveScrollPosition() {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.removeItem(ARCHIVE_SCROLL_PERCENTAGE_KEY);
    sessionStorage.removeItem(ARCHIVE_SCROLL_VIEW_KEY);
  } catch (error) {
    // Silently fail if sessionStorage is unavailable
  }
}

/**
 * Hook to restore scroll position when returning to archive page, changing views, or on page refresh
 * @param {string} view - The current archive view ('list' or 'images')
 */
export function useArchiveScrollRestore(view) {
  const pathname = usePathname();
  const hasRestoredRef = useRef(false);
  const previousViewRef = useRef(view);
  const isArchivePage = pathname === '/archive';

  useEffect(() => {
    // Only restore on archive page
    if (isArchivePage && view) {
      // Check if there's a saved position in sessionStorage
      const hasSavedPosition = typeof window !== 'undefined' && 
        sessionStorage.getItem(ARCHIVE_SCROLL_PERCENTAGE_KEY) !== null &&
        sessionStorage.getItem(ARCHIVE_SCROLL_VIEW_KEY) !== null;

      // Check if view changed (for view switching)
      const viewChanged = previousViewRef.current !== view;
      
      // Reset restore flag if view changed (allow restoration on view change)
      if (viewChanged) {
        hasRestoredRef.current = false;
        previousViewRef.current = view;
      }

      // Restore if we haven't restored yet for this view AND there's a saved position
      if (!hasRestoredRef.current && hasSavedPosition) {
        // Wait for custom elements to be ready (scroll-container and mask-scroll)
        let retryCount = 0;
        const MAX_RETRIES = 20; // Max 20 retries (20 * 50ms = 1 second total)
        
        const checkAndRestore = () => {
          const hasListContainer = view === 'list' ? document.querySelector('scroll-container') : true;
          const hasImagesContainer = view === 'images' ? document.querySelector('mask-scroll') : true;
          
          if (hasListContainer && hasImagesContainer) {
            restoreArchiveScrollPosition(view, () => {
              hasRestoredRef.current = true;
            });
          } else if (retryCount < MAX_RETRIES) {
            // Retry after a short delay if custom elements aren't ready yet
            retryCount++;
            setTimeout(checkAndRestore, 50);
          } else {
            // Max retries reached, mark as restored to prevent infinite loops
            hasRestoredRef.current = true;
          }
        };

        // Start checking after a short initial delay
        const timeoutId = setTimeout(checkAndRestore, 100);

        return () => clearTimeout(timeoutId);
      } else if (!hasSavedPosition) {
        // No saved position, mark as "restored" so we don't keep trying
        hasRestoredRef.current = true;
      }
    }

    // Reset restore flag when leaving archive page
    if (!isArchivePage) {
      hasRestoredRef.current = false;
      previousViewRef.current = null;
    }
  }, [isArchivePage, view]);
}
