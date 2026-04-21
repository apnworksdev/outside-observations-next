'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import ArchiveEntry from '@/app/_components/Archive/features/entry/ArchiveEntryListRow';
import ArchiveEntryMediaLink from '@/app/_components/Archive/features/entry/ArchiveEntryMediaLink';
import ArchiveListLegend from '@/app/_components/Archive/features/list/ArchiveListLegend';
import { useArchiveListSorting } from '@/app/_components/Archive/features/list/ArchiveListSorting';
import { useArchiveListScrollPersistence } from '@/app/_components/Archive/features/list/useArchiveListScrollPersistence';
import { useArchiveListMeasurement } from '@/app/_components/Archive/features/list/useArchiveListMeasurement';
import { useArchiveListScrollResync } from '@/app/_components/Archive/features/list/useArchiveListScrollResync';
import MaskScrollWrapper from '@/app/_web-components/MaskScrollWrapper';
import ScrollContainerWrapper from '@/app/_web-components/ScrollContainerWrapper';
import { useArchiveEntries } from '../../providers/ArchiveEntriesProvider';
import { trackArchiveLoaded } from '@/app/_helpers/analytics/gtag';
import { useArchiveScrollRestore } from '@/app/_hooks/archive/useArchiveScrollPosition';
import { ErrorBoundary } from '@/app/_components/shared/error/ErrorBoundary';
import { ArchiveListErrorFallback } from '@/app/_components/shared/error/ErrorFallbacks';

import styles from '@app/_assets/archive/archive-page.module.css';

/** Stable style object — SSR + client both start hidden until scroll lock runs (no hydration mismatch). */
const OFFSCREEN_SCROLL_LOCK_STYLE = { visibility: 'hidden' };

export default function ArchiveListContent() {
  const { view, visibleEntries, searchStatus } = useArchiveEntries();
  const { typeSort, handleSortClick, sortableLegendColumns } = useArchiveListSorting();
  // Hidden until useLayoutEffect + rAF applies top or saved scroll — avoids any visible "middle" frame.
  const [archiveContentVisible, setArchiveContentVisible] = useState(false);

  useArchiveScrollRestore(view, setArchiveContentVisible);

  // GA4: which view was used when landing on archive (list vs images usage)
  const archiveLoadedSentRef = useRef(false);
  useEffect(() => {
    if (view && !archiveLoadedSentRef.current) {
      archiveLoadedSentRef.current = true;
      trackArchiveLoaded(view);
    }
  }, [view]);

  useArchiveListScrollPersistence(view);

  // Initialize view content opacity on mount
  useLayoutEffect(() => {
    if (viewContentRef.current) {
      gsap.set(viewContentRef.current, { opacity: 1 });
    }
    isInitialMountRef.current = false;
  }, []);

  // Handle view transition animation - use useLayoutEffect to hide before paint
  useLayoutEffect(() => {
    // Skip initial mount
    if (isInitialMountRef.current) {
      previousViewRef.current = view;
      return;
    }

    // Skip if view hasn't changed
    if (previousViewRef.current === view) {
      return;
    }

    const viewContent = viewContentRef.current;
    if (!viewContent) {
      previousViewRef.current = view;
      return;
    }

    // Kill any existing animation
    if (viewTransitionAnimationRef.current) {
      viewTransitionAnimationRef.current.kill();
    }

    // Mark that we have a pending view change
    pendingViewChangeRef.current = true;

    // Immediately hide content synchronously before paint (prevents flash)
    gsap.set(viewContent, { opacity: 0 });

    previousViewRef.current = view;
  }, [view]);

  // Fade in new content after view change (runs after React renders new view)
  useEffect(() => {
    // Only fade in if we have a pending view change
    if (!pendingViewChangeRef.current) {
      return;
    }

    const viewContent = viewContentRef.current;
    if (!viewContent) {
      pendingViewChangeRef.current = false;
      return;
    }

    // Wait for React to render new content, then fade in
    const timeoutId = setTimeout(() => {
      if (viewContentRef.current) {
        // Kill any existing animation
        if (viewTransitionAnimationRef.current) {
          viewTransitionAnimationRef.current.kill();
        }

        viewTransitionAnimationRef.current = gsap.to(viewContentRef.current, {
          opacity: 1,
          duration: 0.3,
          ease: 'power2.out',
          onComplete: () => {
            viewTransitionAnimationRef.current = null;
            pendingViewChangeRef.current = false;
          },
        });
      } else {
        pendingViewChangeRef.current = false;
      }
    }, 50); // Small delay to ensure DOM has updated with new view

    return () => {
      clearTimeout(timeoutId);
      if (viewTransitionAnimationRef.current) {
        viewTransitionAnimationRef.current.kill();
        viewTransitionAnimationRef.current = null;
      }
    };
  }, [view]);

  const contentRef = useRef(null);
  const viewContentRef = useRef(null);
  const viewTransitionAnimationRef = useRef(null);
  const previousViewRef = useRef(view);
  const pendingViewChangeRef = useRef(false);
  const isInitialMountRef = useRef(true);
  const scrollContainerRef = useRef(null);

  const hasEntries = visibleEntries.length > 0;
  const visibleEntriesSignature = useMemo(
    () => visibleEntries.map((entry) => entry._id).join('|'),
    [visibleEntries]
  );
  const { isScrollNeeded, scheduleMeasurement } = useArchiveListMeasurement({
    hasEntries,
    view,
    visibleEntriesSignature,
    contentRef,
    scrollContainerRef,
  });
  useArchiveListScrollResync({ archiveContentVisible, view, isScrollNeeded, visibleEntriesSignature });

  const handleImageLoad = useCallback(() => {
    scheduleMeasurement();
  }, [scheduleMeasurement]);

  // Handle error state
  const hasError = searchStatus?.status === 'error';
  const errorMessage = searchStatus?.error;

  return (
    <ErrorBoundary fallback={ArchiveListErrorFallback}>
      <div className={styles.container} data-view={view}>
        {hasError && errorMessage && (
          <div className={styles.errorBanner}>
            <p className={styles.errorBannerText}>
              Search error: {errorMessage}. Please try a different search.
            </p>
          </div>
        )}
        <div ref={contentRef}>
          <div
            ref={viewContentRef}
            style={archiveContentVisible ? undefined : OFFSCREEN_SCROLL_LOCK_STYLE}
          >
            {hasEntries ? (
              view === 'images' ? (
                <MaskScrollWrapper className={`${styles.containerContent} isAtTop`}>
                  {visibleEntries.map((entry, index) => (
                    <ArchiveEntryMediaLink
                      key={entry._id}
                      entry={entry}
                      index={index}
                      onImageLoad={handleImageLoad}
                    />
                  ))}
                </MaskScrollWrapper>
              ) : (
                <ScrollContainerWrapper
                  ref={scrollContainerRef}
                  className={styles.containerContent}
                  data-scroll-state={isScrollNeeded ? 'needed' : 'not-needed'}
                >
                  {visibleEntries.map((entry, index) => (
                    <ArchiveEntry key={entry._id} entry={entry} index={index} />
                  ))}
                </ScrollContainerWrapper>
              )
            ) : null}
          </div>
        </div>
        <ArchiveListLegend
          hasEntries={hasEntries}
          sortableLegendColumns={sortableLegendColumns}
          typeSort={typeSort}
          onSortClick={handleSortClick}
        />
      </div>
    </ErrorBoundary>
  );
}

