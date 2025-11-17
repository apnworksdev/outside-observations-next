import { notFound } from 'next/navigation';
import { client } from '@/sanity/lib/client';
import { ARCHIVE_ENTRY_QUERY, ARCHIVE_ENTRY_SLUGS } from '@/sanity/lib/queries';
import styles from '@app/_assets/archive/archive-entry.module.css';
import { ArchiveEntryArticle, ArchiveEntryMetadata } from '@/app/_components/Archive/ArchiveEntryContent';
import ArchiveEntryBackdrop from '@/app/_components/Archive/ArchiveEntryBackdrop';

export async function generateStaticParams() {
  try {
    const slugs = await client.fetch(ARCHIVE_ENTRY_SLUGS);
    
    // Handle case where fetch returns null/undefined or empty array
    if (!Array.isArray(slugs)) {
      return [];
    }
    
    return slugs.map((slug) => ({
      slug: slug,
    }));
  } catch (error) {
    // If Sanity fetch fails during build, return empty array
    // This allows the build to succeed and pages will be generated on-demand
    console.error('Failed to fetch archive entry slugs during build:', error);
    return [];
  }
}

export default async function ArchiveEntryPage({ params }) {
  const resolvedParams = await params;
  const entry = await client.fetch(ARCHIVE_ENTRY_QUERY, {
    slug: resolvedParams.slug,
  });

  if (!entry) {
    notFound()
  }

  return (
    <ArchiveEntryBackdrop>
      <div className={styles.archiveEntryContentWrapper}>
        <ArchiveEntryArticle entry={entry} />
      </div>
      <aside className={styles.archiveEntryAside}>
        <ArchiveEntryMetadata entry={entry} />
      </aside>
    </ArchiveEntryBackdrop>
  );
}
