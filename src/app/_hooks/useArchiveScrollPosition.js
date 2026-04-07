'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export const ARCHIVE_SCROLL_PERCENTAGE_KEY = 'archive_scroll_percentage';
export const ARCHIVE_SCROLL_VIEW_KEY = 'archive_scroll_view';
export const ARCHIVE_SCROLL_RESTORE_PENDING_KEY = 'archive_scroll_restore_pending';

// Cache scroll element references to avoid repeated DOM queries
const scrollElementCache = { list: null, images: null };

/**
 * Gets the scroll element for a given view (with caching).
 * Returns null if the cached element is detached (e.g. after navigating away)
 * so we never read stale scroll values and overwrite sessionStorage with 0.
 * @param {string} view - The current view ('list' or 'images')
 * @returns {HTMLElement|null} The scroll element or null
 */
function getScrollElement(view) {
  if (view === 'list') {
    if (scrollElementCache.list && !scrollElementCache.list.isConnected) {
      scrollElementCache.list = null;
    }
    if (!scrollElementCache.list) {
      scrollElementCache.list = document.querySelector('scroll-container');
    }
    return scrollElementCache.list;
  } else {
    if (scrollElementCache.images && !scrollElementCache.images.isConnected) {
      scrollElementCache.images = null;
    }
    if (!scrollElementCache.images) {
      scrollElementCache.images = document.querySelector('mask-scroll');
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
      // Last resort: use window scroll only if we're likely on the archive (mask-scroll not found but container exists)
      const container = document.querySelector('[data-view="images"]');
      if (container) {
        const scrollPosition = window.scrollY || window.pageYOffset || 0;
        scrollHeight = document.documentElement.scrollHeight;
        clientHeight = window.innerHeight;
        maxScroll = scrollHeight - clientHeight;
        scrollPercentage = maxScroll > 0 ? scrollPosition / maxScroll : 0;
      }
    }

    // Only write when we had a valid scroll context; otherwise we would overwrite
    // a good saved position with 0 when e.g. navigating away (detached nodes) or before restore.
    const hadValidContext = scrollElement !== null || (view === 'images' && document.querySelector('[data-view="images"]'));
    if (hadValidContext) {
      sessionStorage.setItem(ARCHIVE_SCROLL_PERCENTAGE_KEY, String(scrollPercentage));
      sessionStorage.setItem(ARCHIVE_SCROLL_VIEW_KEY, view);
    }
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
 * Ensures archive starts at top when no restore should happen.
 * This avoids stale custom-element scroll state showing users a mid-list position.
 */
export function resetArchiveScrollToTop(currentView, onDone) {
  if (typeof window === 'undefined') return;

  let retryCount = 0;
  const MAX_RETRIES = 60; // 3 seconds total at 50ms intervals

  const applyTop = () => {
    const preferredElement =
      currentView === 'list'
        ? document.querySelector('scroll-container')
        : document.querySelector('mask-scroll');
    const listElement = document.querySelector('scroll-container');
    const imagesElement = document.querySelector('mask-scroll');

    // Always reset window scroll too, so browser history restoration cannot keep
    // a stale middle position when we explicitly want "top".
    window.scrollTo(0, 0);

    if (preferredElement) preferredElement.scrollTop = 0;
    if (listElement) listElement.scrollTop = 0;
    if (imagesElement) imagesElement.scrollTop = 0;

    if (preferredElement || listElement || imagesElement) {
      if (onDone) onDone();
      return;
    }

    if (retryCount < MAX_RETRIES) {
      retryCount++;
      setTimeout(applyTop, 50);
    } else if (onDone) {
      onDone();
    }
  };

  requestAnimationFrame(applyTop);
}

/**
 * Clears the saved scroll position
 */
export function clearArchiveScrollPosition() {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.removeItem(ARCHIVE_SCROLL_PERCENTAGE_KEY);
    sessionStorage.removeItem(ARCHIVE_SCROLL_VIEW_KEY);
    sessionStorage.removeItem(ARCHIVE_SCROLL_RESTORE_PENDING_KEY);
  } catch (error) {
    // Silently fail if sessionStorage is unavailable
  }
}

/**
 * Marks that the next archive page load should restore saved scroll.
 * This is set right before navigating from archive list to an archive entry.
 */
export function markArchiveScrollRestorePending(event) {
  if (typeof window === 'undefined') return;

  try {
    // Only mark pending restore for same-tab navigations.
    // Ignore modified/multi-tab interactions (Cmd/Ctrl click, middle click, etc).
    if (event && typeof event === 'object') {
      const hasModifier = !!(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
      if (hasModifier) return;

      if (typeof event.button === 'number' && event.button !== 0) {
        return;
      }

      const target = event.currentTarget?.getAttribute?.('target');
      if (target && target !== '_self') {
        return;
      }
    }

    sessionStorage.setItem(ARCHIVE_SCROLL_RESTORE_PENDING_KEY, '1');
  } catch (error) {
    // Silently fail if sessionStorage is unavailable
  }
}

/**
 * Returns whether the next archive mount should attempt restoring saved scroll.
 */
export function isArchiveScrollRestorePending() {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(ARCHIVE_SCROLL_RESTORE_PENDING_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Hook to restore scroll position when returning to archive page, changing views, or on page refresh
 * @param {string} view - The current archive view ('list' or 'images')
 */
export function useArchiveScrollRestore(view, onRestoreSettled) {
  const pathname = usePathname();
  const isArchivePage = pathname === '/archive';
  const retryTimeoutRef = useRef(null);
  const initialActionTimeoutRef = useRef(null);
  const hasSettledRef = useRef(false);
  const hasAppliedInitialActionRef = useRef(false);

  const settleRestore = useCallback(() => {
    if (hasSettledRef.current) return;
    hasSettledRef.current = true;
    if (typeof onRestoreSettled === 'function') {
      onRestoreSettled();
    }
  }, [onRestoreSettled]);

  useEffect(() => {
    // Reset state when leaving archive page.
    if (!isArchivePage) {
      hasAppliedInitialActionRef.current = false;
      clearScrollElementCache();
      hasSettledRef.current = false;
      if (initialActionTimeoutRef.current) {
        clearTimeout(initialActionTimeoutRef.current);
        initialActionTimeoutRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      return;
    }

    if (!view || hasAppliedInitialActionRef.current || typeof window === 'undefined') {
      return;
    }

    // Let initial view hydration settle first (images/list can switch once on mount).
    // This prevents running both restore and reset on successive early renders.
    initialActionTimeoutRef.current = setTimeout(() => {
      if (hasAppliedInitialActionRef.current) return;

      const hasSavedPosition =
        sessionStorage.getItem(ARCHIVE_SCROLL_PERCENTAGE_KEY) !== null &&
        sessionStorage.getItem(ARCHIVE_SCROLL_VIEW_KEY) !== null;

      hasAppliedInitialActionRef.current = true;

      // Deterministic rule:
      // - saved scroll in sessionStorage => restore
      // - no saved scroll => force top
      if (hasSavedPosition) {
        restoreArchiveScrollPosition(view, settleRestore);
      } else {
        sessionStorage.removeItem(ARCHIVE_SCROLL_PERCENTAGE_KEY);
        sessionStorage.removeItem(ARCHIVE_SCROLL_VIEW_KEY);
        resetArchiveScrollToTop(view, settleRestore);
      }

      // Clear pending marker since it is no longer part of restore decision.
      sessionStorage.removeItem(ARCHIVE_SCROLL_RESTORE_PENDING_KEY);
    }, 120);

    return () => {
      if (initialActionTimeoutRef.current) {
        clearTimeout(initialActionTimeoutRef.current);
        initialActionTimeoutRef.current = null;
      }
    };
  }, [isArchivePage, view, settleRestore]);
}
