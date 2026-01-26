'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { usePrefetchOnHover } from '@/app/_hooks/usePrefetchOnHover';
import { useContentWarningConsent } from '@/app/_contexts/ContentWarningConsentContext';

import SanityImage from '@/sanity/components/SanityImage';
import SanityVideo from '@/sanity/components/SanityVideo';
import { ProtectedMediaWrapper } from '@/app/_components/Archive/ProtectedMediaWrapper';
import ArchiveEntry from '@/app/_components/Archive/ArchiveEntryListRow';
import ArchiveVisualEssay from '@/app/_components/Archive/ArchiveVisualEssay';
import MaskScrollWrapper from '@/app/_web-components/MaskScrollWrapper';
import ScrollContainerWrapper from '@/app/_web-components/ScrollContainerWrapper';
import { useArchiveEntries, useArchiveSortController } from './ArchiveEntriesProvider';
import { useArchiveEntryVisited } from '@/app/_hooks/useArchiveEntryVisited';
import { saveArchiveScrollPosition, useArchiveScrollRestore, restoreArchiveScrollPosition, clearScrollElementCache, ARCHIVE_SCROLL_PERCENTAGE_KEY, ARCHIVE_SCROLL_VIEW_KEY } from '@/app/_hooks/useArchiveScrollPosition';
import { ErrorBoundary } from '@/app/_components/ErrorBoundary';
import { ArchiveListErrorFallback } from '@/app/_components/ErrorFallbacks';

import styles from '@app/_assets/archive/archive-page.module.css';

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

// Reduced from 400px to 300px to save bandwidth - archive thumbnails don't need full resolution
const POSTER_WIDTH = 300;

// Component for archive entry image link with prefetching
function ArchiveEntryImageLink({ entry, onImageLoad, index = 0 }) {
  const slug = entry.metadata?.slug || entry.slug
  const hasSlug = slug?.current
  const slugValue = slug?.current || null;
  const isVisualEssay = entry.mediaType === 'visualEssay';
  const [currentImage, setCurrentImage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const href = hasSlug
    ? `/archive/entry/${slug.current}${isVisualEssay ? `?image=${currentImageIndex}` : ''}`
    : null;
  const prefetchHandlers = usePrefetchOnHover(href, 300);
  // Set priority for first 4 images (above the fold)
  const isPriority = index < 4;
  const isVideo = entry.mediaType === 'video';
  const posterHeight = entry?.poster?.dimensions?.aspectRatio
    ? Math.round(POSTER_WIDTH / entry.poster.dimensions.aspectRatio)
    : POSTER_WIDTH;

  // Check if entry has been visited (hydration-safe)
  const isVisited = useArchiveEntryVisited(slugValue);

  // Get consent state from context
  const { hasConsent } = useContentWarningConsent();
  const hasContentWarning = entry.metadata?.contentWarning === true;

  // Get current view to save scroll position
  const { view } = useArchiveEntries();

  // Handle mouse down to save scroll position before navigation
  // Using onMouseDown instead of onClick to ensure it runs before navigation
  const handleMouseDown = () => {
    if (view) {
      try {
        saveArchiveScrollPosition(view);
      } catch (error) {
        // Silently fail if save fails
      }
    }
  };

  // For visual essays, overlay uses the currently displayed image's metadata
  const overlayMeta = isVisualEssay && currentImage?.metadata
    ? currentImage.metadata
    : entry.metadata;
  const overlayYear = overlayMeta?.year?.value ?? entry.year ?? '';
  const overlaySource = overlayMeta?.source || entry.source || '';
  const overlayArtName = overlayMeta?.artName || entry.artName || '';

  const hasYear = String(overlayYear ?? '').trim() !== '';
  const hasSource = String(overlaySource ?? '').trim() !== '';
  const hasArtName = String(overlayArtName ?? '').trim() !== '';

  // Hide metadata overlay if contentWarning is true and user hasn't consented
  const shouldShowMetadataOverlay = !hasContentWarning || hasConsent;
  // For visual essays, show overlay but with empty content (to keep hover effect)
  const shouldShowOverlayContent = shouldShowMetadataOverlay && !isVisualEssay;

  const content = (
    <div className={styles.archiveEntryImageWrapper}>
      {isVisualEssay ? (
        <ArchiveVisualEssay
          entry={entry}
          width={POSTER_WIDTH}
          contentWarning={entry.metadata?.contentWarning}
          priority={isPriority}
          onCurrentImageChange={(img, idx) => {
            setCurrentImage(img);
            if (typeof idx === 'number') setCurrentImageIndex(idx);
          }}
        />
      ) : isVideo && entry.video ? (
        <ProtectedMediaWrapper
          contentWarning={entry.metadata?.contentWarning}
        >
          <SanityVideo
            video={entry.video}
            poster={entry.poster}
            alt={entry.metadata?.artName || entry.artName || 'Archive entry video'}
            className={styles.archiveEntryVideo}
            fallbackClassName={styles.archiveEntryImage}
            width={POSTER_WIDTH}
            height={posterHeight}
            maxWidth={POSTER_WIDTH}
            priority={isPriority}
            preload={isPriority ? "metadata" : "none"}
            muted
            playsInline
            onLoad={onImageLoad}
          />
        </ProtectedMediaWrapper>
      ) : (
        <ProtectedMediaWrapper
          contentWarning={entry.metadata?.contentWarning}
        >
          <SanityImage
            image={entry.poster}
            alt={entry.metadata?.artName || entry.artName || 'Archive entry poster'}
            className={styles.archiveEntryImage}
            width={POSTER_WIDTH}
            height={posterHeight}
            priority={isPriority}
            loading={isPriority ? undefined : 'lazy'}
            placeholder={entry?.poster?.lqip ? 'blur' : undefined}
            blurDataURL={entry?.poster?.lqip || undefined}
            quality={isPriority ? 70 : 60}
            onLoad={onImageLoad}
          />
        </ProtectedMediaWrapper>
      )}
      {shouldShowMetadataOverlay && (
        <div className={styles.archiveEntryImageOverlay}>
          {shouldShowOverlayContent && (
            <div className={styles.archiveEntryImageOverlayContent}>
              {hasYear && (
                <div className={styles.archiveEntryImageOverlayContentItem}><p>{overlayYear}</p></div>
              )}
              {hasSource && (
                <div className={styles.archiveEntryImageOverlayContentItem}><p>{overlaySource}</p></div>
              )}
              {hasArtName && (
                <div className={styles.archiveEntryImageOverlayContentItem}><p>{overlayArtName}</p></div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const linkProps = {
    className: styles.archiveEntryImageLink,
    'data-visited': isVisited ? 'true' : 'false',
  };

  // Disable link if contentWarning is active and user hasn't consented
  const isLinkDisabled = hasContentWarning && !hasConsent;
  const shouldRenderLink = hasSlug && !isLinkDisabled;

  return (
    <div className={styles.archiveEntryImageContainer}>
      {shouldRenderLink ? (
        <Link
          href={href}
          {...linkProps}
          {...prefetchHandlers}
          onMouseDown={handleMouseDown}
        >
          {content}
        </Link>
      ) : (
        <div {...linkProps}>
          {content}
        </div>
      )}
    </div>
  );
}

export default function ArchiveListContent() {
  const { view, visibleEntries, searchStatus } = useArchiveEntries();
  const yearSort = useArchiveSortController('year', {
    label: 'Year',
    ariaMessages: {
      desc: 'Year column, sorted newest to oldest. Activate to sort oldest to newest.',
      asc: 'Year column, sorted oldest to newest. Activate to clear sorting.',
      inactive: 'Year column, no sorting applied. Activate to sort newest to oldest.',
    },
  });
  const artNameSort = useArchiveSortController('artName', { label: 'Art Name' });
  const sourceSort = useArchiveSortController('source', { label: 'Source/Author' });
  const typeSort = useArchiveSortController('mediaType', { label: 'Type' });

  // Restore scroll position when returning to archive or changing views
  useArchiveScrollRestore(view);

  // Track the last saved scroll position in a ref
  const lastScrollPositionRef = useRef({ view: null, position: 0, percentage: 0 });

  // Cache scroll element reference to avoid repeated DOM queries
  const scrollElementRef = useRef(null);

  // Save scroll position on scroll events (optimized with cached element and change detection)
  useEffect(() => {
    if (!view) return;

    let scrollTimeout = null;
    let rafId = null;
    let lastSavedPosition = 0;
    let lastSavedPercentage = 0;

    const handleScroll = () => {
      // Use requestAnimationFrame for better performance
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        const scrollElement = scrollElementRef.current;
        if (!scrollElement) return;

        // Get current scroll position
        const scrollPosition = scrollElement.scrollTop;
        const scrollHeight = scrollElement.scrollHeight;
        const clientHeight = scrollElement.clientHeight;
        const maxScroll = scrollHeight - clientHeight;
        const scrollPercentage = maxScroll > 0 ? scrollPosition / maxScroll : 0;

        // Only update if position changed significantly (avoid unnecessary saves)
        const positionDiff = Math.abs(scrollPosition - lastSavedPosition);
        const percentageDiff = Math.abs(scrollPercentage - lastSavedPercentage);
        
        // Update ref immediately (for view change detection)
        lastScrollPositionRef.current = {
          view,
          position: scrollPosition,
          percentage: scrollPercentage
        };

        // Only save to sessionStorage if position changed meaningfully (threshold: 5px or 0.1%)
        if (positionDiff > 5 || percentageDiff > 0.001) {
          // Debounce sessionStorage writes
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(() => {
            lastSavedPosition = scrollPosition;
            lastSavedPercentage = scrollPercentage;
            saveArchiveScrollPosition(view);
          }, 150); // Slightly longer debounce for sessionStorage writes
        }
      });
    };

    const setupScrollListener = () => {
      // Cache the scroll element reference (query once)
      if (view === 'list') {
        scrollElementRef.current = document.querySelector('scroll-container');
      } else {
        scrollElementRef.current = document.querySelector('mask-scroll');
        // Fallback if not found
        if (!scrollElementRef.current) {
          const container = document.querySelector('[data-view="images"]');
          if (container) {
            scrollElementRef.current = container.querySelector('mask-scroll');
          }
        }
      }

      if (scrollElementRef.current) {
        scrollElementRef.current.addEventListener('scroll', handleScroll, { passive: true });
        return true;
      }
      return false;
    };

    // Try immediately, retry if needed
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

  // Save scroll position when view changes - use the ref value (last known position)
  const previousViewForSaveRef = useRef(view);
  useEffect(() => {
    if (previousViewForSaveRef.current && previousViewForSaveRef.current !== view) {
      // Clear cache when view changes (elements might have changed)
      clearScrollElementCache();
      
      // Use the last known position from the ref (saved during scroll)
      const lastPosition = lastScrollPositionRef.current;
      if (lastPosition.view === previousViewForSaveRef.current) {
        // Save the last known percentage for the old view
        try {
          sessionStorage.setItem(ARCHIVE_SCROLL_PERCENTAGE_KEY, String(lastPosition.percentage));
          sessionStorage.setItem(ARCHIVE_SCROLL_VIEW_KEY, previousViewForSaveRef.current);
        } catch (error) {
          // Silently fail if save fails
        }
      }
    }
    previousViewForSaveRef.current = view;
  }, [view]);

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

  const sortableLegendColumns = useMemo(
    () => [
      { key: 'year', label: 'Year', sort: yearSort },
      { key: 'artName', label: 'Art Name', sort: artNameSort },
      { key: 'source', label: 'Source/Author', sort: sourceSort },
    ],
    [artNameSort, sourceSort, yearSort]
  );
  const contentRef = useRef(null);
  const viewContentRef = useRef(null);
  const measurementFrameRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const viewTransitionAnimationRef = useRef(null);
  const previousViewRef = useRef(view);
  const pendingViewChangeRef = useRef(false);
  const isInitialMountRef = useRef(true);
  const [isScrollNeeded, setIsScrollNeeded] = useState(true);

  const hasEntries = visibleEntries.length > 0;
  const visibleEntriesSignature = useMemo(
    () => visibleEntries.map((entry) => entry._id).join('|'),
    [visibleEntries]
  );

  /**
   * The archive layout relies on CSS custom properties that mirror the rendered height.
   * To avoid layout shifts we:
   *   - Measure the list container via rAF and keep the measurement debounced.
   *   - Write the result into `--archive-list-height`, which downstream styles use to
   *     position navigation elements.
   *   - Detect whether scrolling is actually required so we can toggle overflow states.
   * This block runs in both views because the navigation depends on the aggregate height.
   */
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
  }, [hasEntries, view]);

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

  /**
   * Measurements need to stay current when:
   *   - the set of visible entries changes (search, view switch, duplication),
   *   - the viewport resizes,
   *   - or the component unmounts.
   * The effects below cover each of those cases, centralising cleanup so we never leave
   * dangling animation frames or stale CSS variables behind.
   */
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
          <div ref={viewContentRef}>
            {hasEntries ? (
              view === 'images' ? (
                <MaskScrollWrapper className={`${styles.containerContent} isAtTop`}>
                  {visibleEntries.map((entry, index) => (
                    <ArchiveEntryImageLink
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
        <div
          className={styles.containerLegend}
          data-visible={hasEntries ? 'true' : 'false'}
          aria-hidden={hasEntries ? undefined : 'true'}
        >
          {sortableLegendColumns.map(({ key, label, sort }) => (
            <div key={key} className={styles.containerLegendColumn}>
              <button
                type="button"
                className={styles.containerLegendColumnButton}
                onClick={sort.toggleSort}
                data-sort-state={sort.dataState}
                aria-label={sort.ariaLabel}
              >
                <span>{label}</span>
                <span aria-hidden="true" className={styles.containerLegendSortIndicator}>
                  {sort.indicator}
                </span>
              </button>
            </div>
          ))}
          <div className={styles.containerLegendColumn}>
            <div className={styles.containerLegendColumnItem}>
              <p>Tags</p>
            </div>
          </div>
          <div className={styles.containerLegendColumn}>
            <div className={styles.containerLegendColumnItem}>
              <p>Mood Tags</p>
            </div>
          </div>
          <div className={styles.containerLegendColumn}>
            <button
              type="button"
              className={styles.containerLegendColumnButton}
              onClick={typeSort.toggleSort}
              data-sort-state={typeSort.dataState}
              aria-label={typeSort.ariaLabel}
            >
              <span>Type</span>
              <span aria-hidden="true" className={styles.containerLegendSortIndicator}>
                {typeSort.indicator}
              </span>
            </button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

