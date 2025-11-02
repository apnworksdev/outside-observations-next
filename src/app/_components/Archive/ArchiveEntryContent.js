import Image from 'next/image';

import { urlFor } from '@/sanity/lib/image';
import styles from '@app/_assets/archive.module.css';

export function ArchiveEntryArticle({ entry, headingId }) {
  const posterWidth = 1200;
  const posterHeight = entry?.poster?.dimensions?.aspectRatio ? Math.round(posterWidth / entry.poster.dimensions.aspectRatio) : posterWidth;
  const layout = entry?.poster?.dimensions?.aspectRatio > 1 ? 'landscape' : 'portrait';

  return (
    <article className={`${styles.archiveEntryModalContent} ${styles[layout]}`}>
      <div className={styles.archiveEntryModalHeader}>
        <h1 className={styles.archiveEntryModalTitle} id={headingId}>
          {entry.artName}
        </h1>
      </div>
      {entry?.poster?.asset?._ref ? (
        <div className={styles.archiveEntryModalBody}>
          <div className={styles.archiveEntryModalPosterContainer}>
            <Image
              src={urlFor(entry.poster).width(posterWidth).url()}
              className={styles.archiveEntryModalPoster}
              alt={entry.artName}
              width={posterWidth}
              height={posterHeight}
              priority
            />
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function ArchiveEntryMetadata({ entry }) {
  return (
    <div className={styles.archiveEntryModalAsideContent}>
      <div className={styles.archiveEntryModalAsideContentItem}>
        <p>{entry.year}</p>
      </div>
      <div className={styles.archiveEntryModalAsideContentItem}>
        <p>{entry.artName}</p>
      </div>
      <div className={styles.archiveEntryModalAsideContentItem}>
        <p>{entry.fileName}</p>
      </div>
      <div className={styles.archiveEntryModalAsideContentItem}>
        <p>{entry.source}</p>
      </div>
      <div className={styles.archiveEntryModalAsideContentItem}>
        <p>{entry.tags.map((tag) => tag.name).join(', ')}</p>
      </div>
      <div className={styles.archiveEntryModalAsideContentItem}>
        <p>Image</p>
      </div>
    </div>
  );
}

