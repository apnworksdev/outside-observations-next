'use client';

import { useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';

import styles from '@app/_assets/archive/unexpected.module.css';
import SanityImage from '@/sanity/components/SanityImage';
import SanityVideo from '@/sanity/components/SanityVideo';
import { ProtectedMediaWrapper } from '@/app/_components/Archive/ProtectedMediaWrapper';
import UnexpectedConnectionsComparison from './UnexpectedConnectionsComparison';

function setGlobalPrimaryMediaHeight(value) {
  if (typeof document !== 'undefined') {
    if (value) {
      document.documentElement.style.setProperty('--unexpected-primary-media-height', `${value}px`);
    } else {
      document.documentElement.style.removeProperty('--unexpected-primary-media-height');
    }
  }
}

export default function UnexpectedConnectionsContent({
  items = [],
  comparisonPayload = null,
  mediaWidth,
}) {
  const primaryItemRef = useRef(null);
  const primaryMediaWrapperRef = useRef(null);
  const measurementFrameRef = useRef(null);
  const resizeObserverRef = useRef(null);

  const measurePrimaryMediaHeight = useCallback(() => {
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
        setGlobalPrimaryMediaHeight(roundedHeight);
      }
    });
  }, []);

  const primaryItemSignature = [
    items[0]?.entry?._id ?? 'id',
    items[0]?.calculatedHeight ?? 'height',
    (items[0]?.entry?.metadata?.artName || items[0]?.entry?.artName) ?? 'title',
  ].join('-');

  useEffect(() => {
    measurePrimaryMediaHeight();
  }, [measurePrimaryMediaHeight, mediaWidth, primaryItemSignature]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleResize = () => {
      measurePrimaryMediaHeight();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [measurePrimaryMediaHeight]);

  // Use ResizeObserver to detect when the media size changes
  // (e.g., when image or video loads, or when fallback is shown)
  useEffect(() => {
    const wrapper = primaryMediaWrapperRef.current;
    if (!wrapper || typeof window === 'undefined' || !window.ResizeObserver) {
      return undefined;
    }

    // Clean up existing observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    // Create ResizeObserver to watch for size changes
    resizeObserverRef.current = new ResizeObserver(() => {
      measurePrimaryMediaHeight();
    });

    resizeObserverRef.current.observe(wrapper);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [measurePrimaryMediaHeight]);

  useEffect(() => {
    return () => {
      if (measurementFrameRef.current !== null) {
        window.cancelAnimationFrame(measurementFrameRef.current);
      }

      setGlobalPrimaryMediaHeight(null);
    };
  }, []);

  if (!items.length) {
    return null;
  }

  return (
    <section className={styles.unexpectedConnectionsContainer}>
      <div className={styles.unexpectedConnectionsGrid}>
        {items.map(({ entry, calculatedHeight, href }, index) => {
          const isPrimary = index === 0;
          const itemKey = entry?._id ?? `item-${index}`;

          const media =
            entry.mediaType === 'video' && entry.video?.asset?.url ? (
              <SanityVideo
                video={entry.video}
                poster={entry.poster}
                alt={entry.metadata?.artName || entry.artName || 'Archive entry video'}
                width={mediaWidth}
                height={calculatedHeight}
                className={styles.unexpectedConnectionsVideo}
                fallbackClassName={styles.unexpectedConnectionsItemMedia}
                priority={isPrimary}
                onLoad={isPrimary ? measurePrimaryMediaHeight : undefined}
                data-primary={isPrimary ? 'true' : 'false'}
              />
            ) : (
              <SanityImage
                image={entry.poster}
                alt={entry.metadata?.artName || entry.artName || 'Archive entry'}
                width={mediaWidth}
                height={calculatedHeight}
                priority={isPrimary}
                loading={isPrimary ? undefined : 'lazy'}
                placeholder={entry.poster?.lqip ? 'blur' : undefined}
                blurDataURL={entry.poster?.lqip || undefined}
                className={styles.unexpectedConnectionsItemMedia}
                data-primary={isPrimary ? 'true' : 'false'}
                onLoad={isPrimary ? measurePrimaryMediaHeight : undefined}
              />
            );

          const protectedMedia = (
            <ProtectedMediaWrapper contentWarning={entry.metadata?.contentWarning}>
              {media}
            </ProtectedMediaWrapper>
          );

          return (
            <div
              key={itemKey}
              className={styles.unexpectedConnectionsItem}
              ref={isPrimary ? primaryItemRef : undefined}
            >
              <div className={styles.unexpectedConnectionsItemTitleWrapper}>
                <p className={styles.unexpectedConnectionsItemTitle}>{entry.metadata?.artName || entry.artName}</p>
              </div>
              <div
                ref={isPrimary ? primaryMediaWrapperRef : undefined}
                className={styles.unexpectedConnectionsItemMediaWrapper}
                data-primary={isPrimary ? 'true' : 'false'}
              >
                {href ? (
                  <Link href={href} className={styles.unexpectedConnectionsMediaLink}>
                    {protectedMedia}
                  </Link>
                ) : (
                  protectedMedia
                )}
              </div>
            </div>
          );
        })}
        {comparisonPayload ? (
          <UnexpectedConnectionsComparison comparisonPayload={comparisonPayload} />
        ) : null}
      </div>
    </section>
  );
}


