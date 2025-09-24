import { client } from '@/sanity/lib/client'
import { ARCHIVE_ENTRIES_QUERY } from '@/sanity/lib/queries'
import ArchiveEntry from '@app/_components/ArchiveEntry'
import styles from '@app/_assets/archive.module.css'
import Script from 'next/script'

// Enable ISR - revalidate every 60 seconds
export const revalidate = 60

// Generate metadata for better SEO
export async function generateMetadata() {
  const entries = await client.fetch(ARCHIVE_ENTRIES_QUERY);
  
  return {
    title: 'Outside Observation - Archive',
    description: `Browse ${entries.length} archive entries from Outside Observation`,
    openGraph: {
      title: 'Outside Observation - Archive',
      description: `Browse ${entries.length} archive entries from Outside Observation`,
      type: 'website',
    },
  }
}

export default async function Archive() {
  const entries = await client.fetch(ARCHIVE_ENTRIES_QUERY);

  const additionalEntries = [];

  for (let i = 0; i < 50; i++) {
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
        {additionalEntries.length > 0 ? (
          additionalEntries.map((entry, index) => (
            <ArchiveEntry key={entry._id} entry={entry} isFirst={index === 0} />
          ))
        ) : (
          <p>No archive entries found. Create some entries in your Sanity Studio!</p>
        )}

      </div>
    </div>
  );
}