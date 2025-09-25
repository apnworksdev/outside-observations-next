import Image from 'next/image';
import Link from 'next/link';
import { urlFor } from '@/sanity/lib/image';
import styles from '@app/_assets/archive.module.css';

export default function ArchiveEntry({ entry }) {
  const hasSlug = entry.slug?.current;
  
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
          {entry.poster && (
            <div className={styles.itemPoster}>
              <Image
                src={urlFor(entry.poster).width(300).height(400).url()}
                alt={entry.artName || 'Archive entry poster'}
                width={300}
                height={400}
                loading="lazy"
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
              />
            </div>
          )}
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
          <p>Image</p>
        </div>
      </div>
    </div>
  );

  return hasSlug ? (
    <Link href={`/archive/${entry.slug.current}`} className={styles.itemContainer}>
      {content}
    </Link>
  ) : (
    <div className={styles.itemContainer}>
      {content}
    </div>
  );
}