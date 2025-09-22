import { client } from '@/sanity/lib/client'
import { ARCHIVE_ENTRIES_QUERY } from '@/sanity/lib/queries'
import ArchiveEntry from '@/ui/components/ArchiveEntry'
import styles from "./page.module.css";

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

export default async function Home() {
  const entries = await client.fetch(ARCHIVE_ENTRIES_QUERY);

  return (
    <div className={styles.page}>
      <h1>Outside Observation</h1>
      
      <div className={styles.archiveContainer}>
        {entries.length > 0 ? (
          entries.map((entry, index) => (
            <ArchiveEntry key={entry._id} entry={entry} isFirst={index === 0} />
          ))
        ) : (
          <p>No archive entries found. Create some entries in your Sanity Studio!</p>
        )}
      </div>
    </div>
  );
}
