import SanityImage from '@/sanity/components/SanityImage';
import ArchiveEntryVideo from './ArchiveEntryVideo';
import styles from '@app/_assets/archive/archive-entry.module.css';

export function ArchiveEntryArticle({ entry, headingId }) {
  const posterWidth = 1200;
  const posterHeight = entry?.poster?.dimensions?.aspectRatio ? Math.round(posterWidth / entry.poster.dimensions.aspectRatio) : posterWidth;
  const layout = entry?.poster?.dimensions?.aspectRatio > 1 ? 'landscape' : 'portrait';
  const isVideo = entry.mediaType === 'video';

  return (
    <article className={`${styles.archiveEntryModalContent} ${styles[layout]}`}>
      <div className={styles.archiveEntryModalHeader}>
        <h1 className={styles.archiveEntryModalTitle} id={headingId}>
          {entry.artName}
        </h1>
      </div>
      <div className={styles.archiveEntryModalBody}>
        <div className={styles.archiveEntryModalPosterContainer}>
          {isVideo && entry.video ? (
            <ArchiveEntryVideo
              video={entry.video}
              poster={entry.poster}
              alt={entry.artName}
            />
          ) : (
            <SanityImage
              image={entry.poster}
              alt={entry.artName}
              width={posterWidth}
              height={posterHeight}
              className={styles.archiveEntryModalPoster}
              priority
            />
          )}
        </div>
      </div>
    </article>
  );
}

export function ArchiveEntryMetadata({ entry }) {
  return (
    <div className={styles.archiveEntryModalAsideContent}>
      <div className={`${styles.archiveEntryModalAsideContentItem} ${styles.archiveEntryModalAsideYear}`}>
        <p>{entry.year}</p>
      </div>
      <div className={`${styles.archiveEntryModalAsideContentItem} ${styles.archiveEntryModalAsideArtName}`}>
        <p>{entry.artName}</p>
      </div>
      <div className={`${styles.archiveEntryModalAsideContentItem} ${styles.archiveEntryModalAsideFileName}`}>
        <p>{entry.fileName}</p>
      </div>
      <div className={`${styles.archiveEntryModalAsideContentItem} ${styles.archiveEntryModalAsideSource}`}>
        <p>{entry.source}</p>
      </div>
      <div className={`${styles.archiveEntryModalAsideContentItem} ${styles.archiveEntryModalAsideTags}`}>
        <p>{entry.tags?.map((tag) => tag.name).join(', ')}</p>
      </div>
      <div className={`${styles.archiveEntryModalAsideContentItem} ${styles.archiveEntryModalAsideType}`}>
        <p>{entry.mediaType ? entry.mediaType.charAt(0).toUpperCase() + entry.mediaType.slice(1) : 'Image'}</p>
      </div>
    </div>
  );
}

