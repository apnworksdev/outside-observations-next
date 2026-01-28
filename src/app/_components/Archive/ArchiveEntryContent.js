import SanityImage from '@/sanity/components/SanityImage';
import ArchiveEntryVideo from './ArchiveEntryVideo';
import ScrollToVisualEssayImage from './ScrollToVisualEssayImage';
import { ProtectedMediaWrapper } from './ProtectedMediaWrapper';
import styles from '@app/_assets/archive/archive-entry.module.css';

// Helper function to render portable text blocks
function renderTextMarkup(blocks) {
  if (!blocks || !Array.isArray(blocks)) return null;
  
  return blocks
    .map((block, index) => {
      if (block._type !== 'block' || !block.children || !Array.isArray(block.children)) return null;
      
      const text = block.children
        .map(child => child?.text || '')
        .join('')
        .trim();
      
      // Skip empty text blocks
      if (!text) return null;
      
      // All heading styles (h1, h2, h3, etc.) render as h2
      if (block.style === 'h1' || block.style === 'h2' || block.style === 'h3' || 
          block.style === 'h4' || block.style === 'h5' || block.style === 'h6') {
        return <h2 key={index}>{text}</h2>;
      }
      
      // Default to paragraph for 'normal' style or any other style
      return <p key={index}>{text}</p>;
    })
    .filter(Boolean);
}

export function ArchiveEntryArticle({ entry, headingId, initialImageIndex }) {
  // Validation: Check if required fields are missing (development only)
  if (process.env.NODE_ENV !== 'production') {
    const hasArtName = entry?.metadata?.artName || entry?.artName;
    if (!hasArtName) {
      console.warn(
        `[ArchiveEntryArticle] Entry ${entry?._id || 'unknown'} is missing artName in both metadata and top-level structure.`
      );
    }
  }

  const isVisualEssay = entry.mediaType === 'visualEssay';

  // If it's a visual essay, render completely different structure
  if (isVisualEssay) {
    const visualEssayImages = entry?.visualEssayImages || [];
    const validImages = visualEssayImages.filter(img => img?.image?.asset?._ref);
    const validImageCount = validImages.length;
    const textMarkup = entry?.textMarkup;

    // If no images and no text, return null to avoid rendering empty article
    if (validImageCount === 0 && !textMarkup) {
      return null;
    }

    return (
      <article className={styles.archiveEntryVisualContainer}>
        {textMarkup && (
          <div className={styles.archiveEntryVisualTextWrapper}>
            {renderTextMarkup(textMarkup)}
          </div>
        )}
        {validImages.map((image, index) => {
          if (!image?.image) return null;
          
          const imageWidth = image.image?.dimensions?.width || 1200;
          const aspectRatio = image.image?.dimensions?.aspectRatio;
          const imageHeight = aspectRatio && aspectRatio > 0 
            ? Math.round(imageWidth / aspectRatio) 
            : imageWidth;
          const layout = aspectRatio && aspectRatio > 1 ? 'landscape' : 'portrait';

          return (
            <div
              key={image._id || index}
              id={`ve-image-${index}`}
              className={`${styles.archiveEntryVisualImageWrapper} ${styles[layout]}`}
            >
              <div className={styles.archiveEntryModalContentWrapper}>
                <div className={styles.archiveEntryModalBody}>
                  <div className={styles.archiveEntryModalHeader}>
                    <h3 className={styles.archiveEntryModalTitle}>
                      {image.metadata?.fileName || image.metadata?.artName || ''}
                    </h3>
                    {validImageCount > 0 && (
                      <p className={styles.archiveEntryVisualImageCounter}>
                        {index + 1} of {validImageCount}
                      </p>
                    )}
                  </div>
                  <div className={styles.archiveEntryModalPosterContainer}>
                    <ProtectedMediaWrapper
                      contentWarning={entry.metadata?.contentWarning}
                      className={styles.archiveEntryModalPosterInner}
                    >
                      <SanityImage
                        image={image.image}
                        alt={image.metadata?.artName || image.metadata?.fileName || 'Visual essay image'}
                        width={imageWidth}
                        height={imageHeight}
                        className={styles.archiveEntryModalPoster}
                        placeholder={image?.image?.lqip ? 'blur' : undefined}
                        blurDataURL={image?.image?.lqip || undefined}
                        priority
                      />
                    </ProtectedMediaWrapper>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <ScrollToVisualEssayImage
          imageIndex={
            initialImageIndex != null &&
            initialImageIndex >= 0 &&
            initialImageIndex < validImageCount
              ? initialImageIndex
              : null
          }
          entrySlug={entry.metadata?.slug?.current ?? entry.slug?.current ?? ''}
        />
      </article>
    );
  }

  const posterWidth = entry?.poster?.dimensions?.width || 1200;
  const posterHeight = entry?.poster?.dimensions?.aspectRatio ? Math.round(posterWidth / entry.poster.dimensions.aspectRatio) : posterWidth;
  const layout = entry?.poster?.dimensions?.aspectRatio > 1 ? 'landscape' : 'portrait';
  const isVideo = entry.mediaType === 'video';

  // Regular rendering for non-visual-essay entries (width from server so header has stable width before image loads)
  return (
    <article className={`${styles.archiveEntryModalContent} ${styles[layout]}`}>
      <div className={styles.archiveEntryModalContentWrapper}>
        <div className={styles.archiveEntryModalBody}>
          <div className={styles.archiveEntryModalHeader}>
            <h1 className={styles.archiveEntryModalTitle} {...(headingId ? { id: headingId } : {})}>
              {entry.metadata?.artName || entry.artName}
            </h1>
          </div>
          <div className={styles.archiveEntryModalPosterContainer}>
            {isVideo && entry.video ? (
              <ArchiveEntryVideo
                video={entry.video}
                poster={entry.poster}
                alt={entry.metadata?.artName || entry.artName}
                contentWarning={entry.metadata?.contentWarning}
                entrySlug={entry.metadata?.slug?.current ?? entry.slug?.current ?? ''}
              />
            ) : (
              <ProtectedMediaWrapper
                contentWarning={entry.metadata?.contentWarning}
                className={styles.archiveEntryModalPosterInner}
              >
                <SanityImage
                  image={entry.poster}
                  alt={entry.metadata?.artName || entry.artName}
                  width={posterWidth}
                  height={posterHeight}
                  className={styles.archiveEntryModalPoster}
                  placeholder={entry.poster?.lqip ? 'blur' : undefined}
                  blurDataURL={entry.poster?.lqip || undefined}
                  priority
                />
              </ProtectedMediaWrapper>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function ArchiveEntryMetadata({ entry }) {
  const metadata = entry.metadata || {}
  const isVisualEssay = entry.mediaType === 'visualEssay';
  // Handle year as object with {value, isEstimate} structure or legacy string/number
  const year = metadata.year?.value ?? entry.year ?? '–'
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
        <p>{isVisualEssay ? '–' : (entry.metadata?.source || entry.source || '–')}</p>
      </div>
      <div className={`${styles.archiveEntryModalAsideContentItem} ${styles.archiveEntryModalAsideSource}`}>
        <p>{(entry.metadata?.tags || entry.tags || []).filter(Boolean).map((tag) => tag?.name).filter(Boolean).join(', ')}</p>
      </div>
      <div className={`${styles.archiveEntryModalAsideContentItem} ${styles.archiveEntryModalAsideTags}`}>
        <p>{((entry.aiMoodTags || []).filter(Boolean).map((tag) => tag?.name).filter(Boolean).join(', ') || '–')}</p>
      </div>
      <div className={`${styles.archiveEntryModalAsideContentItem} ${styles.archiveEntryModalAsideType}`}>
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
  );
}

