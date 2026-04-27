'use client';

import { useEffect } from 'react';
import {
  getArchiveScrollElement,
  syncArchiveScrollTopFromSession,
  enforceArchiveScrollTopWhenNoSession,
  ARCHIVE_SCROLL_PERCENTAGE_KEY,
  ARCHIVE_SCROLL_VIEW_KEY,
} from '@/app/_hooks/archive/useArchiveScrollPosition';

export function useArchiveListScrollResync({ archiveContentVisible, view, isScrollNeeded }) {
  useEffect(() => {
    if (!archiveContentVisible || !view) {
      return undefined;
    }

    const run = () => {
      const scrollElement = getArchiveScrollElement(view);
      if (!scrollElement) {
        return;
      }

      try {
        const hasSavedScroll =
          sessionStorage.getItem(ARCHIVE_SCROLL_PERCENTAGE_KEY) !== null &&
          sessionStorage.getItem(ARCHIVE_SCROLL_VIEW_KEY) !== null;

        // Only restore while scroller is still at top; never override active user scroll.
        const isAtTop = scrollElement.scrollTop <= 2;
        if (
          hasSavedScroll &&
          isAtTop
        ) {
          syncArchiveScrollTopFromSession(view);
        } else if (!hasSavedScroll && isAtTop) {
          enforceArchiveScrollTopWhenNoSession(view);
        }
      } catch {
        if (scrollElement.scrollTop <= 2) {
          enforceArchiveScrollTopWhenNoSession(view);
        }
      }
    };

    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf1 = 0;
      raf2 = requestAnimationFrame(run);
    });

    const RESYNC_DEBOUNCE_MS = 120;
    let ro = null;
    let debounceId = null;
    const el = getArchiveScrollElement(view);
    if (el && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        if (debounceId !== null) {
          clearTimeout(debounceId);
        }
        debounceId = window.setTimeout(() => {
          debounceId = null;
          run();
        }, RESYNC_DEBOUNCE_MS);
      });
      ro.observe(el);
    }

    return () => {
      if (raf1) {
        cancelAnimationFrame(raf1);
      }
      if (raf2) {
        cancelAnimationFrame(raf2);
      }
      if (debounceId !== null) {
        clearTimeout(debounceId);
      }
      if (ro) {
        ro.disconnect();
      }
    };
  }, [archiveContentVisible, view, isScrollNeeded]);
}
