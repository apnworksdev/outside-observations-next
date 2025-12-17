'use client';

import Link from 'next/link';
import SanityImage from '@/sanity/components/SanityImage';
import SanityVideo from '@/sanity/components/SanityVideo';
import { usePrefetchOnHover } from '@/app/_hooks/usePrefetchOnHover';
import styles from '@app/_assets/archive/archive-page.module.css';

export default function ArchiveEntryListRow({ entry, index = 0 }) {
  const hasSlug = entry.slug?.current;
  const posterWidth = 400;
  const href = hasSlug ? `/archive/entry/${entry.slug.current}` : null;
  const prefetchHandlers = usePrefetchOnHover(href, 300);
  // Set priority for first 3 rows (above the fold in list view)
  const isPriority = index < 3;
  const content = (
    <div className={styles.itemWrapper}>
      <div className={`${styles.itemColumn} ${styles.itemColumnYear}`}>
        <div className={styles.itemColumnContent}>
          <p>{entry.year}</p>
        </div>
      </div>
      <div className={`${styles.itemColumn} ${styles.itemColumnArtName}`}>
        <div className={styles.itemColumnContent}>
          <p>{entry.artName}</p>
        </div>
      </div>
      <div className={`${styles.itemColumn} ${styles.itemColumnFileName}`}>
        <div className={styles.itemColumnContent}>
          <p>{entry.fileName}</p>
        </div>
        <div className={styles.itemPoster}>
          {entry.mediaType === 'video' ? (
            <SanityVideo
              video={entry.video}
              poster={entry.poster}
              alt={entry.artName || 'Archive entry video'}
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
              alt={entry.artName || 'Archive entry poster'}
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
          <p>{entry.source}</p>
        </div>
      </div>
      <div className={`${styles.itemColumn} ${styles.itemColumnTags}`}>
        <div className={styles.itemColumnContent}>
          <p>{entry.tags.map((tag) => tag.name).join(', ')}</p>
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