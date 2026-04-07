'use client';

import { useCallback, useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';

export const ARCHIVE_SCROLL_PERCENTAGE_KEY = 'archive_scroll_percentage';
export const ARCHIVE_SCROLL_VIEW_KEY = 'archive_scroll_view';

/**
 * Scrollable host for the active archive view (same node for save + restore).
 */
export function getArchiveScrollElement(view) {
  if (typeof document === 'undefined') return null;
  if (view === 'list') {
    return (
      document.querySelector('[data-view="list"] scroll-container') ||
      document.querySelector('scroll-container')
    );
  }
  return (
    document.querySelector('[data-view="images"] mask-scroll') ||
    document.querySelector('mask-scroll')
  );
}

const RESTORE_LAYOUT_EPSILON = 0.002;

function hasArchiveScrollSessionKeys() {
  try {
    return (
      sessionStorage.getItem(ARCHIVE_SCROLL_PERCENTAGE_KEY) !== null &&
      sessionStorage.getItem(ARCHIVE_SCROLL_VIEW_KEY) !== null
    );
  } catch {
    return false;
  }
}

/** When there is no saved archive scroll, keep the scroller pinned to top across layout changes. */
export function enforceArchiveScrollTopWhenNoSession(view) {
  if (typeof window === 'undefined') return;
  try {
    if (hasArchiveScrollSessionKeys()) {
      return;
    }
    const el = getArchiveScrollElement(view);
    if (!el || el.scrollTop === 0) {
      return;
    }
    el.scrollTop = 0;
  } catch {
    // ignore
  }
}

/**
 * Apply saved scroll percentage or top. Resets window scroll first.
 * @returns {boolean} true when safe to show the grid (element found + layout ready when restoring)
 */
export function applyArchiveScrollSync(view) {
  if (typeof window === 'undefined') return false;

  window.scrollTo(0, 0);

  const scrollEl = getArchiveScrollElement(view);
  if (!scrollEl) {
    return false;
  }

  try {
    const pctStr = sessionStorage.getItem(ARCHIVE_SCROLL_PERCENTAGE_KEY);
    const viewKey = sessionStorage.getItem(ARCHIVE_SCROLL_VIEW_KEY);
    const hasSaved = pctStr !== null && viewKey !== null;
    const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;

    // Saved position is for a specific mode; don't apply list % to images scroller (or vice versa).
    if (hasSaved && viewKey !== view) {
      scrollEl.scrollTop = 0;
      return true;
    }

    if (hasSaved) {
      const pct = parseFloat(pctStr);
      if (Number.isNaN(pct) || pct < 0 || pct > 1) {
        sessionStorage.removeItem(ARCHIVE_SCROLL_PERCENTAGE_KEY);
        sessionStorage.removeItem(ARCHIVE_SCROLL_VIEW_KEY);
        scrollEl.scrollTop = 0;
      } else if (maxScroll > 0) {
        scrollEl.scrollTop = pct * maxScroll;
      } else if (pct > RESTORE_LAYOUT_EPSILON) {
        scrollEl.scrollTop = 0;
        return false;
      } else {
        scrollEl.scrollTop = 0;
      }
    } else {
      sessionStorage.removeItem(ARCHIVE_SCROLL_PERCENTAGE_KEY);
      sessionStorage.removeItem(ARCHIVE_SCROLL_VIEW_KEY);
      scrollEl.scrollTop = 0;
    }
  } catch {
    scrollEl.scrollTop = 0;
  }

  return true;
}

/**
 * Re-apply saved % to scrollTop only (no window scroll).
 * Call after layout changes (overflow toggle, images loading) so the position stays stable.
 */
export function syncArchiveScrollTopFromSession(view) {
  if (typeof window === 'undefined') return;

  const scrollEl = getArchiveScrollElement(view);
  if (!scrollEl) return;

  try {
    const pctStr = sessionStorage.getItem(ARCHIVE_SCROLL_PERCENTAGE_KEY);
    const viewKey = sessionStorage.getItem(ARCHIVE_SCROLL_VIEW_KEY);
    if (pctStr === null || viewKey === null || viewKey !== view) {
      return;
    }

    const pct = parseFloat(pctStr);
    if (Number.isNaN(pct) || pct < 0 || pct > 1) {
      return;
    }

    const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
    if (maxScroll > 0) {
      const target = pct * maxScroll;
      const before = scrollEl.scrollTop;
      // Skip if already aligned — avoids thrash when maxScroll is mid-layout (good → wrong → good flicker).
      if (Math.abs(before - target) <= 2) {
        return;
      }
      scrollEl.scrollTop = target;
    }
  } catch {
    // ignore
  }
}

/** Persist current scroll as 0–1 for this view. */
export function saveArchiveScrollPosition(view) {
  if (typeof window === 'undefined') return;

  try {
    const scrollElement = getArchiveScrollElement(view);
    if (!scrollElement) return;

    const maxScroll = scrollElement.scrollHeight - scrollElement.clientHeight;
    const scrollPercentage = maxScroll > 0 ? scrollElement.scrollTop / maxScroll : 0;

    sessionStorage.setItem(ARCHIVE_SCROLL_PERCENTAGE_KEY, String(scrollPercentage));
    sessionStorage.setItem(ARCHIVE_SCROLL_VIEW_KEY, view);
  } catch {
    // ignore
  }
}

/**
 * Applies session scroll before show; keeps grid hidden until layout can honor saved %.
 */
export function useArchiveScrollRestore(view, setArchiveContentVisible) {
  const pathname = usePathname();
  const isArchiveIndex = pathname.replace(/\/$/, '') === '/archive';

  const setVisible = useCallback(
    (visible) => {
      if (typeof setArchiveContentVisible === 'function') {
        setArchiveContentVisible(visible);
      }
    },
    [setArchiveContentVisible]
  );

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || !('scrollRestoration' in history)) {
      return undefined;
    }
    const previous = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    return () => {
      history.scrollRestoration = previous;
    };
  }, []);

  useLayoutEffect(() => {
    if (!isArchiveIndex || !view) {
      setVisible(true);
      return;
    }

    setVisible(false);

    let frame = 0;
    let rafId = 0;
    const MAX_FRAMES = 90;

    const tick = () => {
      const settled = applyArchiveScrollSync(view);
      frame += 1;
      const ready = (settled && frame >= 2) || frame >= MAX_FRAMES;
      if (ready) {
        if (!settled) {
          applyArchiveScrollSync(view);
        }
        setVisible(true);
        if (!hasArchiveScrollSessionKeys()) {
          const forceTop = () => {
            const el = getArchiveScrollElement(view);
            if (el && el.scrollTop !== 0) {
              el.scrollTop = 0;
            }
          };
          requestAnimationFrame(() => {
            forceTop();
            requestAnimationFrame(forceTop);
          });
        }
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isArchiveIndex, view, setVisible]);
}
