import Image from 'next/image'
import { urlFor } from '@/sanity/lib/image'
import styles from './ArchiveEntry.module.css'

export default function ArchiveEntry({ entry, isFirst = false }) {
  return (
    <div className={styles.archiveEntry}>
      {entry.poster && (
        <div className={styles.posterContainer}>
          <Image
            src={urlFor(entry.poster).width(300).height(400).url()}
            alt={entry.artName || 'Archive entry poster'}
            width={300}
            height={400}
            className={styles.posterImage}
            priority={isFirst}
          />
        </div>
      )}
      
      <div className={styles.entryDetails}>
        <h3>{entry.artName}</h3>
        <p><strong>Year:</strong> {entry.year}</p>
        <p><strong>File Name:</strong> {entry.fileName}</p>
        <p><strong>Source/Author:</strong> {entry.source}</p>
        
        {entry.tags && entry.tags.length > 0 && (
          <div className={styles.tags}>
            <strong>Tags:</strong>
            <div className={styles.tagList}>
              {entry.tags.map((tag) => (
                <span key={tag._id} className={styles.tag}>
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
