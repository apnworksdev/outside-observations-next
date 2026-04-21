'use client';

import { useEffect, useRef } from 'react';
import {
  saveArchiveScrollPosition,
  getArchiveScrollElement,
  ARCHIVE_SCROLL_PERCENTAGE_KEY,
  ARCHIVE_SCROLL_VIEW_KEY,
} from '@/app/_hooks/useArchiveScrollPosition';

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
