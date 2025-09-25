import Script from 'next/script';

import { client } from '@/sanity/lib/client';
import { ARCHIVE_ENTRIES_QUERY } from '@/sanity/lib/queries';
import ArchiveEntry from '@app/_components/ArchiveEntry';
import styles from '@app/_assets/archive.module.css';

// Enable ISR - revalidate every 60 seconds
export const revalidate = 60;

// Generate metadata for better SEO (cached)
export async function generateMetadata() {
  return {
    title: 'Outside Observation - Archive',
    description: 'Browse archive entries from Outside Observation',
    openGraph: {
      title: 'Outside Observation - Archive',
      description: 'Browse archive entries from Outside Observation',
      type: 'website',
    },
  };
}

export default async function Archive() {
  const entries = await client.fetch(ARCHIVE_ENTRIES_QUERY);

  // Reduce the number of generated entries for faster development
  const additionalEntries = [];

  for (let i = 0; i < 10; i++) { // Reduced from 50 to 10
    for (let j = 0; j < entries.length; j++) {
      additionalEntries.push({
        ...entries[j],
        _id: `generated-${i}-${j}`,
        year: 2020 + i,
      });
    }
  }

  return (
    <div>
      <div className={styles.container}>
        <scroll-container className={styles.containerContent}>
          {additionalEntries.length > 0 ? (
            additionalEntries.map((entry) => (
              <ArchiveEntry key={entry._id} entry={entry}/>
            ))
          ) : (
            <p>No archive entries found. Create some entries in your Sanity Studio!</p>
          )}
        </scroll-container>
        <Script src="/scroll-container.js" />
      </div>
    </div>
  );
};