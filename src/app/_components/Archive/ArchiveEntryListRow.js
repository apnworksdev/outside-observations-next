import Link from 'next/link';
import SanityImage from '@/sanity/components/SanityImage';
import styles from '@app/_assets/archive/archive-page.module.css';

export default function ArchiveEntryListRow({ entry }) {
  const hasSlug = entry.slug?.current;
  const posterWidth = 400;
  const content = (
    <div className={styles.itemWrapper}>
      <div className={styles.itemColumn}>
        <div className={styles.itemColumnContent}>
          <p>{entry.year}</p>
        </div>
      </div>
      <div className={styles.itemColumn}>
        <div className={styles.itemColumnContent}>
          <p>{entry.artName}</p>
        </div>
      </div>
      <div className={styles.itemColumn}>
        <div className={styles.itemColumnContent}>
          <p>{entry.fileName}</p>
        </div>
        <div className={styles.itemPoster}>
          <SanityImage
            image={entry.poster}
            alt={entry.artName || 'Archive entry poster'}
            width={posterWidth}
            height={entry?.poster?.dimensions?.aspectRatio ? Math.round(posterWidth / entry.poster.dimensions.aspectRatio) : posterWidth}
            loading="lazy"
            blurDataURL={entry?.poster?.lqip || undefined}
          />
        </div>
      </div>
      <div className={styles.itemColumn}>
        <div className={styles.itemColumnContent}>
          <p>{entry.source}</p>
        </div>
      </div>
      <div className={styles.itemColumn}>
        <div className={styles.itemColumnContent}>
          <p>{entry.tags.map((tag) => tag.name).join(', ')}</p>
        </div>
      </div>
      <div className={styles.itemColumn}>
        <div className={styles.itemColumnContent}>
          <p>{entry.type ?? 'Image'}</p>
        </div>
      </div>
    </div>
  );

  return hasSlug ? (
    <Link href={`/archive/entry/${entry.slug.current}`} className={styles.itemContainer}>
      {content}
    </Link>
  ) : (
    <div className={styles.itemContainer}>
      {content}
    </div>
  );
}