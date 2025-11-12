'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { urlFor } from '@/sanity/lib/image';

import styles from '@app/_assets/archive/archive-page.module.css';
import ArchiveEntry from '@/app/_components/Archive/ArchiveEntryListRow';
import MaskScrollWrapper from '@/app/_web-components/MaskScrollWrapper';
import ScrollContainerWrapper from '@/app/_web-components/ScrollContainerWrapper';
import { useArchiveEntries } from './ArchiveEntriesProvider';

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

export default function ArchiveListContent() {
  const { view, visibleEntries } = useArchiveEntries();
  const contentRef = useRef(null);
  const measurementFrameRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [isScrollNeeded, setIsScrollNeeded] = useState(true);

  const hasEntries = visibleEntries.length > 0;
  const visibleEntriesSignature = visibleEntries.map((entry) => entry._id).join('|');

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

  return (
    <div className={styles.container} data-view={view}>
      <div ref={contentRef}>
        {hasEntries ? (
          view === 'images' ? (
            <MaskScrollWrapper className={`${styles.containerContent} isAtTop`}>
              {visibleEntries.map((entry) => (
                <Link
                  key={entry._id}
                  href={`/archive/entry/${entry.slug.current}`}
                  className={styles.archiveEntryImageLink}
                >
                  <div className={styles.archiveEntryImageContainer}>
                    {entry?.poster?.asset?._ref ? (
                      <Image
                        src={urlFor(entry.poster).width(POSTER_WIDTH).url()}
                        alt={entry.artName || 'Archive entry poster'}
                        className={styles.archiveEntryImage}
                        width={POSTER_WIDTH}
                        height={
                          entry?.poster?.dimensions?.aspectRatio
                            ? Math.round(POSTER_WIDTH / entry.poster.dimensions.aspectRatio)
                            : POSTER_WIDTH
                        }
                        loading="lazy"
                        placeholder={entry?.poster?.lqip ? 'blur' : undefined}
                        blurDataURL={entry?.poster?.lqip || undefined}
                        onLoadingComplete={handleImageLoad}
                      />
                    ) : null}
                  </div>
                </Link>
              ))}
            </MaskScrollWrapper>
          ) : (
            <ScrollContainerWrapper
              ref={scrollContainerRef}
              className={styles.containerContent}
              data-scroll-state={isScrollNeeded ? 'needed' : 'not-needed'}
            >
              {visibleEntries.map((entry) => (
                <ArchiveEntry key={entry._id} entry={entry} />
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
        <div className={styles.containerLegendColumn}>
          <div className={styles.containerLegendColumnItem}>
            <p>Year</p>
          </div>
        </div>
        <div className={styles.containerLegendColumn}>
          <div className={styles.containerLegendColumnItem}>
            <p>Art Name</p>
          </div>
        </div>
        <div className={styles.containerLegendColumn}>
          <div className={styles.containerLegendColumnItem}>
            <p>File Name</p>
          </div>
        </div>
        <div className={styles.containerLegendColumn}>
          <div className={styles.containerLegendColumnItem}>
            <p>Source/Author</p>
          </div>
        </div>
        <div className={styles.containerLegendColumn}>
          <div className={styles.containerLegendColumnItem}>
            <p>Tags</p>
          </div>
        </div>
        <div className={styles.containerLegendColumn}>
          <div className={styles.containerLegendColumnItem}>
            <p>Type</p>
          </div>
        </div>
      </div>
    </div>
  );
}

