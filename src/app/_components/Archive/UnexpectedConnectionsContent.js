'use client';

import { useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';

import styles from '@app/_assets/archive/unexpected.module.css';
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
  const measurementFrameRef = useRef(null);

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
    posters[0]?.imageUrl ?? 'url',
    posters[0]?.calculatedHeight ?? 'height',
    posters[0]?.entry?.artName ?? 'title',
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
        {posters.map(({ entry, imageUrl, calculatedHeight }, index) => {
          const isPrimary = index === 0;
          const posterKey = entry?._id ?? `${imageUrl}-${index}`;

          return (
            <div
              key={posterKey}
              className={styles.unexpectedConnectionsItem}
              ref={isPrimary ? primaryItemRef : undefined}
            >
              <div className={styles.unexpectedConnectionsItemTitleWrapper}>
                <p className={styles.unexpectedConnectionsItemTitle}>{entry.artName}</p>
              </div>
              <div
                className={styles.unexpectedConnectionsItemPosterWrapper}
                data-primary={isPrimary ? 'true' : 'false'}
              >
                <Image
                  src={imageUrl}
                  alt={entry.artName || 'Archive entry poster'}
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


