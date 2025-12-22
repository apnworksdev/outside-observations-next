'use client';

import Link from 'next/link';
import SanityImage from '@/sanity/components/SanityImage';
import SanityVideo from '@/sanity/components/SanityVideo';
import ArchiveVisualEssay from '@/app/_components/Archive/ArchiveVisualEssay';
import { usePrefetchOnHover } from '@/app/_hooks/usePrefetchOnHover';
import styles from '@app/_assets/archive/archive-page.module.css';

export default function ArchiveEntryListRow({ entry, index = 0 }) {
  const slug = entry.metadata?.slug || entry.slug
  const hasSlug = slug?.current
  const posterWidth = 400;
  const href = hasSlug ? `/archive/entry/${slug.current}` : null;
  const prefetchHandlers = usePrefetchOnHover(href, 300);
  // Set priority for first 3 rows (above the fold in list view)
  const isPriority = index < 3;
  const content = (
    <div className={styles.itemWrapper}>
      <div className={`${styles.itemColumn} ${styles.itemColumnYear}`}>
        <div className={styles.itemColumnContent}>
          <p>{entry.metadata?.year || entry.year}</p>
        </div>
      </div>
      <div className={`${styles.itemColumn} ${styles.itemColumnArtName}`}>
        <div className={styles.itemColumnContent}>
          <p>{entry.metadata?.artName || entry.artName}</p>
        </div>
      </div>
      <div className={`${styles.itemColumn} ${styles.itemColumnFileName}`}>
        <div className={styles.itemColumnContent}>
          <p>{entry.metadata?.fileName || entry.fileName}</p>
        </div>
        <div className={styles.itemPoster}>
          {entry.mediaType === 'visualEssay' ? (
            <ArchiveVisualEssay entry={entry} width={posterWidth} />
          ) : entry.mediaType === 'video' ? (
            <SanityVideo
              video={entry.video}
              poster={entry.poster}
              alt={entry.metadata?.artName || entry.artName || 'Archive entry video'}
              className={styles.archiveEntryVideo}
              fallbackClassName={styles.archiveEntryImage}
              width={posterWidth}
              height={entry?.poster?.dimensions?.aspectRatio ? Math.round(posterWidth / entry.poster.dimensions.aspectRatio) : posterWidth}
              priority={isPriority}
              preload="metadata"
              muted
              playsInline
            />
          ) : (
            <SanityImage
              image={entry.poster}
              alt={entry.metadata?.artName || entry.artName || 'Archive entry poster'}
              width={posterWidth}
              height={entry?.poster?.dimensions?.aspectRatio ? Math.round(posterWidth / entry.poster.dimensions.aspectRatio) : posterWidth}
              priority={isPriority}
              loading={isPriority ? undefined : 'lazy'}
              blurDataURL={entry?.poster?.lqip || undefined}
            />
          )}
        </div>
      </div>
      <div className={`${styles.itemColumn} ${styles.itemColumnSource}`}>
        <div className={styles.itemColumnContent}>
          <p>{entry.metadata?.source || entry.source}</p>
        </div>
      </div>
      <div className={`${styles.itemColumn} ${styles.itemColumnTags}`}>
        <div className={styles.itemColumnContent}>
          <p>{(entry.metadata?.tags || entry.tags || []).filter(Boolean).map((tag) => tag?.name).filter(Boolean).join(', ')}</p>
        </div>
      </div>
      <div className={`${styles.itemColumn} ${styles.itemColumnType}`}>
        <div className={styles.itemColumnContent}>
          <p>{entry.mediaType ? entry.mediaType.charAt(0).toUpperCase() + entry.mediaType.slice(1) : 'Image'}</p>
        </div>
      </div>
    </div>
  );

  return hasSlug ? (
    <Link 
      href={href} 
      className={styles.itemContainer}
      {...prefetchHandlers}
    >
      {content}
    </Link>
  ) : (
    <div className={styles.itemContainer}>
      {content}
    </div>
  );
}