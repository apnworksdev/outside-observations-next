import { notFound } from 'next/navigation';
import { client } from '@/sanity/lib/client';
import { ARCHIVE_ENTRY_QUERY, ARCHIVE_ENTRY_SLUGS } from '@/sanity/lib/queries';
import styles from '@app/_assets/archive/archive-entry.module.css';
import { ArchiveEntryArticle, ArchiveEntryMetadata } from '@/app/_components/Archive/ArchiveEntryContent';
import ArchiveEntryBackdrop from '@/app/_components/Archive/ArchiveEntryBackdrop';

export async function generateStaticParams() {
  const slugs = await client.fetch(ARCHIVE_ENTRY_SLUGS);
  
  return slugs.map((slug) => ({
    slug: slug,
  }));
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
