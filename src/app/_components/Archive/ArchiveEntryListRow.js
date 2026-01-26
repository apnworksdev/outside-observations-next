'use client';

import { useState } from 'react';
import Link from 'next/link';
import SanityImage from '@/sanity/components/SanityImage';
import SanityVideo from '@/sanity/components/SanityVideo';
import ArchiveVisualEssay from '@/app/_components/Archive/ArchiveVisualEssay';
import { ProtectedMediaWrapper } from '@/app/_components/Archive/ProtectedMediaWrapper';
import { usePrefetchOnHover } from '@/app/_hooks/usePrefetchOnHover';
import { useArchiveEntryVisited } from '@/app/_hooks/useArchiveEntryVisited';
import { useContentWarningConsent } from '@/app/_contexts/ContentWarningConsentContext';
import { useArchiveEntries } from './ArchiveEntriesProvider';
import { saveArchiveScrollPosition } from '@/app/_hooks/useArchiveScrollPosition';
import styles from '@app/_assets/archive/archive-page.module.css';

export default function ArchiveEntryListRow({ entry, index = 0 }) {
  const slug = entry.metadata?.slug || entry.slug
  const hasSlug = slug?.current
  const slugValue = slug?.current || null;
  // Reduced from 400px to 300px to save bandwidth - archive thumbnails don't need full resolution
  const posterWidth = 300;
  const isVisualEssay = entry.mediaType === 'visualEssay';
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const href = hasSlug
    ? `/archive/entry/${slug.current}${isVisualEssay ? `?image=${currentImageIndex}` : ''}`
    : null;
  const prefetchHandlers = usePrefetchOnHover(href, 300);
  // Set priority for first 3 rows (above the fold in list view)
  const isPriority = index < 3;
  
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

  const content = (
    <div className={styles.itemWrapper}>
      <div className={`${styles.itemColumn} ${styles.itemColumnYear}`}>
        <div className={styles.itemColumnContent}>
          <p>{entry.metadata?.year?.value ?? entry.year ?? '–'}</p>
        </div>
      </div>
      <div className={`${styles.itemColumn} ${styles.itemColumnArtName}`}>
        <div className={styles.itemColumnContent}>
          <p>{entry.metadata?.artName || entry.artName}</p>
        </div>
      </div>
      <div className={`${styles.itemColumn} ${styles.itemColumnSource}`}>
        <div className={styles.itemColumnContent}>
          <p>{isVisualEssay ? '–' : (entry.metadata?.source || entry.source || '–')}</p>
        </div>
        <div className={styles.itemPoster}>
          {entry.mediaType === 'visualEssay' ? (
            <ArchiveVisualEssay
              entry={entry}
              width={posterWidth}
              contentWarning={entry.metadata?.contentWarning}
              priority={isPriority}
              onCurrentImageChange={(_, idx) => { if (typeof idx === 'number') setCurrentImageIndex(idx); }}
            />
          ) : entry.mediaType === 'video' ? (
            <ProtectedMediaWrapper
              contentWarning={entry.metadata?.contentWarning}
            >
              <SanityVideo
                video={entry.video}
                poster={entry.poster}
                alt={entry.metadata?.artName || entry.artName || 'Archive entry video'}
                className={styles.archiveEntryVideo}
                fallbackClassName={styles.archiveEntryImage}
                width={posterWidth}
                height={entry?.poster?.dimensions?.aspectRatio ? Math.round(posterWidth / entry.poster.dimensions.aspectRatio) : posterWidth}
                maxWidth={posterWidth}
                priority={isPriority}
                preload={isPriority ? "metadata" : "none"}
                muted
                playsInline
              />
            </ProtectedMediaWrapper>
          ) : (
            <ProtectedMediaWrapper contentWarning={entry.metadata?.contentWarning}>
              <SanityImage
                image={entry.poster}
                alt={entry.metadata?.artName || entry.artName || 'Archive entry poster'}
                width={posterWidth}
                height={entry?.poster?.dimensions?.aspectRatio ? Math.round(posterWidth / entry.poster.dimensions.aspectRatio) : posterWidth}
                priority={isPriority}
                loading={isPriority ? undefined : 'lazy'}
                placeholder={entry?.poster?.lqip ? 'blur' : undefined}
                blurDataURL={entry?.poster?.lqip || undefined}
                quality={isPriority ? 70 : 60}
              />
            </ProtectedMediaWrapper>
          )}
        </div>
      </div>
      <div className={`${styles.itemColumn} ${styles.itemColumnTags}`}>
        <div className={styles.itemColumnContent}>
          <p>{(entry.metadata?.tags || entry.tags || []).filter(Boolean).map((tag) => tag?.name).filter(Boolean).join(', ')}</p>
        </div>
      </div>
      <div className={`${styles.itemColumn} ${styles.itemColumnMoodTags}`}>
        <div className={styles.itemColumnContent}>
          <p>{((entry.aiMoodTags || []).filter(Boolean).map((tag) => tag?.name).filter(Boolean).join(', ') || '–')}</p>
        </div>
      </div>
      <div className={`${styles.itemColumn} ${styles.itemColumnType}`}>
        <div className={styles.itemColumnContent}>
          <p>
            {entry.mediaType
              ? entry.mediaType
                  .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                  .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
                  .trim()
              : 'Image'}
          </p>
        </div>
      </div>
    </div>
  );

  const containerProps = {
    className: styles.itemContainer,
    'data-visited': isVisited ? 'true' : 'false',
  };

  // Disable link if contentWarning is active and user hasn't consented
  const isLinkDisabled = hasContentWarning && !hasConsent;
  const shouldRenderLink = hasSlug && !isLinkDisabled;

  return shouldRenderLink ? (
    <Link 
      href={href} 
      {...containerProps}
      {...prefetchHandlers}
      onMouseDown={handleMouseDown}
    >
      {content}
    </Link>
  ) : (
    <div {...containerProps}>
      {content}
    </div>
  );
}