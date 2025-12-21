import SanityImage from '@/sanity/components/SanityImage';
import ArchiveEntryVideo from './ArchiveEntryVideo';
import styles from '@app/_assets/archive/archive-entry.module.css';

export function ArchiveEntryArticle({ entry, headingId }) {
  // Validation: Check if required fields are missing (development only)
  if (process.env.NODE_ENV !== 'production') {
    const hasArtName = entry?.metadata?.artName || entry?.artName;
    if (!hasArtName) {
      console.warn(
        `[ArchiveEntryArticle] Entry ${entry?._id || 'unknown'} is missing artName in both metadata and top-level structure.`
      );
    }
  }

  const posterWidth = 1200;
  const posterHeight = entry?.poster?.dimensions?.aspectRatio ? Math.round(posterWidth / entry.poster.dimensions.aspectRatio) : posterWidth;
  const layout = entry?.poster?.dimensions?.aspectRatio > 1 ? 'landscape' : 'portrait';
  const isVideo = entry.mediaType === 'video';

  return (
    <article className={`${styles.archiveEntryModalContent} ${styles[layout]}`}>
      <div className={styles.archiveEntryModalContentWrapper}>
        <div className={styles.archiveEntryModalHeader}>
          <h1 className={styles.archiveEntryModalTitle} id={headingId}>
            {entry.metadata?.artName || entry.artName}
          </h1>
        </div>
        <div className={styles.archiveEntryModalBody}>
          <div className={styles.archiveEntryModalPosterContainer}>
            {isVideo && entry.video ? (
              <ArchiveEntryVideo
                video={entry.video}
                poster={entry.poster}
                alt={entry.metadata?.artName || entry.artName}
              />
            ) : (
              <SanityImage
                image={entry.poster}
                alt={entry.metadata?.artName || entry.artName}
                width={posterWidth}
                height={posterHeight}
                className={styles.archiveEntryModalPoster}
                priority
              />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function ArchiveEntryMetadata({ entry }) {
  const metadata = entry.metadata || {}
  const year = metadata.year || entry.year
  const artName = metadata.artName || entry.artName
  const fileName = metadata.fileName || entry.fileName
  const source = metadata.source || entry.source
  const tags = metadata.tags || entry.tags || []
  
  // Validation: Check if critical fields are missing (development only)
  if (process.env.NODE_ENV !== 'production') {
    const missingFields = [];
    if (!artName) missingFields.push('artName');
    if (year === undefined || year === null) missingFields.push('year');
    if (!fileName) missingFields.push('fileName');
    if (!source) missingFields.push('source');
    
    if (missingFields.length > 0) {
      console.warn(
        `[ArchiveEntryMetadata] Entry ${entry?._id || 'unknown'} is missing fields in both metadata and top-level structure: ${missingFields.join(', ')}`
      );
    }
    
    // Check if entry has neither old nor new structure
    const hasOldStructure = entry?.artName || entry?.year !== undefined || entry?.fileName || entry?.source;
    const hasNewStructure = metadata?.artName || metadata?.year !== undefined || metadata?.fileName || metadata?.source;
    
    if (!hasOldStructure && !hasNewStructure && entry?._id) {
      console.warn(
        `[ArchiveEntryMetadata] Entry ${entry._id} appears to have neither old nor new metadata structure. This entry may need migration.`
      );
    }
  }
  
  return (
    <div className={styles.archiveEntryModalAsideContent}>
      <div className={`${styles.archiveEntryModalAsideContentItem} ${styles.archiveEntryModalAsideYear}`}>
        <p>{year}</p>
      </div>
      <div className={`${styles.archiveEntryModalAsideContentItem} ${styles.archiveEntryModalAsideArtName}`}>
        <p>{artName}</p>
      </div>
      <div className={`${styles.archiveEntryModalAsideContentItem} ${styles.archiveEntryModalAsideFileName}`}>
        <p>{fileName}</p>
      </div>
      <div className={`${styles.archiveEntryModalAsideContentItem} ${styles.archiveEntryModalAsideSource}`}>
        <p>{source}</p>
      </div>
      <div className={`${styles.archiveEntryModalAsideContentItem} ${styles.archiveEntryModalAsideTags}`}>
        <p>{tags.filter(Boolean).map((tag) => tag?.name).filter(Boolean).join(', ')}</p>
      </div>
      <div className={`${styles.archiveEntryModalAsideContentItem} ${styles.archiveEntryModalAsideType}`}>
        <p>{entry.mediaType ? entry.mediaType.charAt(0).toUpperCase() + entry.mediaType.slice(1) : 'Image'}</p>
      </div>
    </div>
  );
}

