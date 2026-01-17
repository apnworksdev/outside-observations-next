'use client';

import { useCallback, useEffect, useRef } from 'react';

import styles from '@app/_assets/archive/unexpected.module.css';
import SanityImage from '@/sanity/components/SanityImage';
import UnexpectedConnectionsComparison from './UnexpectedConnectionsComparison';

function setGlobalPrimaryPosterHeight(value) {
  if (typeof document !== 'undefined') {
    if (value) {
      document.documentElement.style.setProperty('--unexpected-primary-poster-height', `${value}px`);
    } else {
      document.documentElement.style.removeProperty('--unexpected-primary-poster-height');
    }
  }
}

export default function UnexpectedConnectionsContent({
  posters = [],
  comparisonPayload = null,
  posterWidth,
}) {
  const primaryItemRef = useRef(null);
  const primaryPosterWrapperRef = useRef(null);
  const measurementFrameRef = useRef(null);
  const resizeObserverRef = useRef(null);

  const measurePrimaryPosterHeight = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (measurementFrameRef.current !== null) {
      window.cancelAnimationFrame(measurementFrameRef.current);
    }

    measurementFrameRef.current = window.requestAnimationFrame(() => {
      const element = primaryItemRef.current;
      if (!element) {
        return;
      }

      const { height } = element.getBoundingClientRect();
      if (height > 0) {
        const roundedHeight = Math.round(height * 10) / 10;
        setGlobalPrimaryPosterHeight(roundedHeight);
      }
    });
  }, []);

  const primaryItemSignature = [
    posters[0]?.entry?._id ?? 'id',
    posters[0]?.calculatedHeight ?? 'height',
    (posters[0]?.entry?.metadata?.artName || posters[0]?.entry?.artName) ?? 'title',
  ].join('-');

  useEffect(() => {
    measurePrimaryPosterHeight();
  }, [measurePrimaryPosterHeight, posterWidth, primaryItemSignature]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleResize = () => {
      measurePrimaryPosterHeight();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [measurePrimaryPosterHeight]);

  // Use ResizeObserver to detect when the poster size changes
  // (e.g., when image loads, or when fallback is shown)
  useEffect(() => {
    const wrapper = primaryPosterWrapperRef.current;
    if (!wrapper || typeof window === 'undefined' || !window.ResizeObserver) {
      return undefined;
    }

    // Clean up existing observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    // Create ResizeObserver to watch for size changes
    resizeObserverRef.current = new ResizeObserver(() => {
      measurePrimaryPosterHeight();
    });

    resizeObserverRef.current.observe(wrapper);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [measurePrimaryPosterHeight]);

  useEffect(() => {
    return () => {
      if (measurementFrameRef.current !== null) {
        window.cancelAnimationFrame(measurementFrameRef.current);
      }

      setGlobalPrimaryPosterHeight(null);
    };
  }, []);

  if (!posters.length) {
    return null;
  }

  return (
    <section className={styles.unexpectedConnectionsContainer}>
      <div className={styles.unexpectedConnectionsGrid}>
        {posters.map(({ entry, calculatedHeight }, index) => {
          const isPrimary = index === 0;
          const posterKey = entry?._id ?? `poster-${index}`;

          return (
            <div
              key={posterKey}
              className={styles.unexpectedConnectionsItem}
              ref={isPrimary ? primaryItemRef : undefined}
            >
              <div className={styles.unexpectedConnectionsItemTitleWrapper}>
                <p className={styles.unexpectedConnectionsItemTitle}>{entry.metadata?.artName || entry.artName}</p>
              </div>
              <div
                ref={isPrimary ? primaryPosterWrapperRef : undefined}
                className={styles.unexpectedConnectionsItemPosterWrapper}
                data-primary={isPrimary ? 'true' : 'false'}
              >
                <SanityImage
                  image={entry.poster}
                  alt={entry.metadata?.artName || entry.artName || 'Archive entry poster'}
                  width={posterWidth}
                  height={calculatedHeight}
                  priority={isPrimary}
                  loading={isPrimary ? undefined : 'lazy'}
                  placeholder={entry.poster?.lqip ? 'blur' : undefined}
                  blurDataURL={entry.poster?.lqip || undefined}
                  className={styles.unexpectedConnectionsItemPoster}
                  data-primary={isPrimary ? 'true' : 'false'}
                  onLoad={isPrimary ? measurePrimaryPosterHeight : undefined}
                />
              </div>
            </div>
          );
        })}
        {comparisonPayload ? (
          <div className={`${styles.unexpectedConnectionsItem} ${styles.unexpectedConnectionsComparisonItem}`}>
            <UnexpectedConnectionsComparison postersPayload={comparisonPayload} />
          </div>
        ) : null}
      </div>
    </section>
  );
}


