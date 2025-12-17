'use client';

import Link from 'next/link';
import SanityImage from '@/sanity/components/SanityImage';
import { usePrefetchOnHover } from '@/app/_hooks/usePrefetchOnHover';
import styles from '@app/_assets/chatbox.module.css';

/**
 * ExploreArchiveLink Component
 * 
 * Displays archive entry images and allows navigation to archive page
 * with pre-populated search results.
 */
export default function ExploreArchiveLink({ 
  messageId, 
  itemIds, 
  searchQuery, 
  imageEntries, 
  navigatingMessageId, 
  onTriggerSearch 
}) {
  const prefetchHandlers = usePrefetchOnHover('/archive', 300);

  return (
    <Link
      href="/archive"
      prefetch={true}
      onClick={(e) => {
        e.preventDefault();
        if (itemIds && searchQuery) {
          onTriggerSearch(messageId, itemIds, searchQuery);
        }
      }}
      className={`${styles.chatBoxMessage} ${styles.chatBoxImagesMessage} ${navigatingMessageId === messageId ? styles.chatBoxImagesMessageLoading : ''}`}
      data-sender="bot"
      aria-label={`Explore ${imageEntries.length} archive entries`}
      aria-busy={navigatingMessageId === messageId}
      {...prefetchHandlers}
    >
      <div className={styles.chatBoxImagesMessageImages}>
        {imageEntries.slice(0, 4).map((entry) => {
          const imageWidth = 300;
          const imageHeight = entry?.poster?.dimensions?.aspectRatio
            ? Math.round(imageWidth / entry.poster.dimensions.aspectRatio)
            : imageWidth;

          return (
            <div key={entry._id} className={styles.chatBoxImageContainer}>
              <SanityImage
                image={entry.poster}
                alt={entry.artName || 'Archive entry poster'}
                width={imageWidth}
                height={imageHeight}
                className={styles.chatBoxImage}
                loading="lazy"
                blurDataURL={entry?.poster?.lqip || undefined}
              />
            </div>
          );
        })}
      </div>
      <div className={styles.chatBoxImagesMessageFooter}>
        <p className={styles.chatBoxImagesMessageFooterText}>
          Explore...
        </p>
        <p className={styles.chatBoxImagesMessageFooterText}>
          {imageEntries.length}
        </p>
      </div>
    </Link>
  );
}
