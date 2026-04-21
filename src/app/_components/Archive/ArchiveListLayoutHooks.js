'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  saveArchiveScrollPosition,
  getArchiveScrollElement,
  syncArchiveScrollTopFromSession,
  enforceArchiveScrollTopWhenNoSession,
  ARCHIVE_SCROLL_PERCENTAGE_KEY,
  ARCHIVE_SCROLL_VIEW_KEY,
} from '@/app/_hooks/useArchiveScrollPosition';

function setGlobalArchiveListHeight(value) {
  if (typeof document === 'undefined') {
    return;
  }

  if (value !== null && value !== undefined) {
    document.documentElement.style.setProperty('--archive-list-height', `${value}px`);
  } else {
    document.documentElement.style.removeProperty('--archive-list-height');
  }
}

export function useArchiveListScrollPersistence(view) {
  const lastScrollPositionRef = useRef({ view: null, position: 0, percentage: 0 });
  const scrollElementRef = useRef(null);
  const previousViewForSaveRef = useRef(view);

  useEffect(() => {
    if (!view) return;

    let scrollTimeout = null;
    let rafId = null;
    let lastSavedPosition = 0;
    let lastSavedPercentage = 0;

    const handleScroll = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        const scrollElement = scrollElementRef.current;
        if (!scrollElement) return;

        const scrollPosition = scrollElement.scrollTop;
        const scrollHeight = scrollElement.scrollHeight;
        const clientHeight = scrollElement.clientHeight;
        const maxScroll = scrollHeight - clientHeight;
        const scrollPercentage = maxScroll > 0 ? scrollPosition / maxScroll : 0;

        lastScrollPositionRef.current = {
          view,
          position: scrollPosition,
          percentage: scrollPercentage,
        };

        const positionDiff = Math.abs(scrollPosition - lastSavedPosition);
        const percentageDiff = Math.abs(scrollPercentage - lastSavedPercentage);

        if (positionDiff > 5 || percentageDiff > 0.001) {
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(() => {
            lastSavedPosition = scrollPosition;
            lastSavedPercentage = scrollPercentage;
            saveArchiveScrollPosition(view);
          }, 150);
        }
      });
    };

    const setupScrollListener = () => {
      scrollElementRef.current = getArchiveScrollElement(view);

      if (scrollElementRef.current) {
        scrollElementRef.current.addEventListener('scroll', handleScroll, { passive: true });
        return true;
      }
      return false;
    };

    if (!setupScrollListener()) {
      const retryTimeout = setTimeout(() => {
        setupScrollListener();
      }, 100);
      return () => {
        clearTimeout(retryTimeout);
        clearTimeout(scrollTimeout);
        if (rafId) {
          cancelAnimationFrame(rafId);
        }
        if (scrollElementRef.current) {
          scrollElementRef.current.removeEventListener('scroll', handleScroll);
        }
        scrollElementRef.current = null;
      };
    }

    return () => {
      clearTimeout(scrollTimeout);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (scrollElementRef.current) {
        scrollElementRef.current.removeEventListener('scroll', handleScroll);
      }
      scrollElementRef.current = null;
    };
  }, [view]);

  useEffect(() => {
    if (previousViewForSaveRef.current && previousViewForSaveRef.current !== view) {
      const lastPosition = lastScrollPositionRef.current;
      if (lastPosition.view === previousViewForSaveRef.current) {
        try {
          sessionStorage.setItem(ARCHIVE_SCROLL_PERCENTAGE_KEY, String(lastPosition.percentage));
          sessionStorage.setItem(ARCHIVE_SCROLL_VIEW_KEY, previousViewForSaveRef.current);
        } catch {
          // Silently fail if save fails
        }
      }
    }
    previousViewForSaveRef.current = view;
  }, [view]);
}

export function useArchiveListMeasurement({ hasEntries, view, visibleEntriesSignature, contentRef, scrollContainerRef }) {
  const measurementFrameRef = useRef(null);
  const [isScrollNeeded, setIsScrollNeeded] = useState(true);

  const performMeasurement = useCallback(() => {
    if (!hasEntries) {
      setGlobalArchiveListHeight(null);
      setIsScrollNeeded(false);
      return;
    }

    const element = contentRef.current;
    if (!element) {
      setGlobalArchiveListHeight(null);
      setIsScrollNeeded(false);
      return;
    }

    const { height } = element.getBoundingClientRect();
    if (height > 0) {
      const roundedHeight = Math.round(height * 10) / 10 + 1;
      setGlobalArchiveListHeight(roundedHeight);
    } else {
      setGlobalArchiveListHeight(0);
    }

    if (view === 'list') {
      const scrollElement = scrollContainerRef.current;
      if (scrollElement) {
        const needsScroll = scrollElement.scrollHeight - scrollElement.clientHeight > 1;
        setIsScrollNeeded((prev) => (prev !== needsScroll ? needsScroll : prev));
      } else {
        setIsScrollNeeded(true);
      }
    } else {
      setIsScrollNeeded((prev) => (prev ? false : prev));
    }
  }, [contentRef, hasEntries, scrollContainerRef, view]);

  const scheduleMeasurement = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (measurementFrameRef.current !== null) {
      window.cancelAnimationFrame(measurementFrameRef.current);
    }

    measurementFrameRef.current = window.requestAnimationFrame(() => {
      measurementFrameRef.current = null;
      performMeasurement();
    });
  }, [performMeasurement]);

  useEffect(() => {
    scheduleMeasurement();
  }, [hasEntries, scheduleMeasurement, view, visibleEntriesSignature]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleResize = () => {
      scheduleMeasurement();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [scheduleMeasurement]);

  useEffect(() => {
    return () => {
      if (measurementFrameRef.current !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(measurementFrameRef.current);
      }
      setGlobalArchiveListHeight(null);
      setIsScrollNeeded(true);
    };
  }, []);

  return { isScrollNeeded, scheduleMeasurement };
}

export function useArchiveListScrollResync({ archiveContentVisible, view, isScrollNeeded, visibleEntriesSignature }) {
  useEffect(() => {
    if (!archiveContentVisible || !view) {
      return undefined;
    }

    const run = () => {
      try {
        if (
          sessionStorage.getItem(ARCHIVE_SCROLL_PERCENTAGE_KEY) !== null &&
          sessionStorage.getItem(ARCHIVE_SCROLL_VIEW_KEY) !== null
        ) {
          syncArchiveScrollTopFromSession(view);
        } else {
          enforceArchiveScrollTopWhenNoSession(view);
        }
      } catch {
        enforceArchiveScrollTopWhenNoSession(view);
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
  }, [archiveContentVisible, view, isScrollNeeded, visibleEntriesSignature]);
}
