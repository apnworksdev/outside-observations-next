'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const POSTER_WIDTH = 400;

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
            priority={isPriority}
            preload="metadata"
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
            quality={isPriority ? 85 : 75}
            onLoad={onImageLoad}
          />
        </ProtectedMediaWrapper>
      )}
      {shouldShowMetadataOverlay && (
        <div className={styles.archiveEntryImageOverlay}>
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
  const sortableLegendColumns = useMemo(
    () => [
      { key: 'year', label: 'Year', sort: yearSort },
      { key: 'artName', label: 'Art Name', sort: artNameSort },
      { key: 'source', label: 'Source/Author', sort: sourceSort },
    ],
    [artNameSort, sourceSort, yearSort]
  );
  const contentRef = useRef(null);
  const measurementFrameRef = useRef(null);
  const scrollContainerRef = useRef(null);
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

