import { notFound } from 'next/navigation';
import { client } from '@/sanity/lib/client';
import { ARCHIVE_ENTRY_QUERY, ARCHIVE_ENTRY_SLUGS } from '@/sanity/lib/queries';
import styles from '@app/_assets/archive/archive-entry.module.css';
import { ArchiveEntryArticle, ArchiveEntryMetadata } from '@/app/_components/Archive/ArchiveEntryContent';
import ArchiveEntryBackdrop from '@/app/_components/Archive/ArchiveEntryBackdrop';
import { ErrorBoundary } from '@/app/_components/ErrorBoundary';
import { ArchiveEntryErrorFallback } from '@/app/_components/ErrorFallbacks';

export async function generateStaticParams() {
  try {
    const slugs = await client.fetch(ARCHIVE_ENTRY_SLUGS);
    
    // Handle case where fetch returns null/undefined or empty array
    if (!Array.isArray(slugs)) {
      console.warn('generateStaticParams: Expected array, got:', typeof slugs);
      return [];
    }
    
    // Filter out invalid slugs
    const validSlugs = slugs.filter(
      (slug) => slug && typeof slug === 'string' && slug.trim().length > 0
    );
    
    return validSlugs.map((slug) => ({
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
  let resolvedParams;
  let entry;

  try {
    resolvedParams = await params;
    
    if (!resolvedParams?.slug) {
      console.error('ArchiveEntryPage: Missing slug parameter');
      notFound();
    }
  } catch (error) {
    console.error('ArchiveEntryPage: Failed to resolve params:', error);
    notFound();
  }

  try {
    entry = await client.fetch(ARCHIVE_ENTRY_QUERY, {
      slug: resolvedParams.slug,
    });
  } catch (error) {
    console.error('ArchiveEntryPage: Failed to fetch entry:', error);
    // If fetch fails, show 404 instead of crashing
    notFound();
  }

  if (!entry) {
    notFound();
  }

  // Validate entry has required fields
  if (!entry.artName && !entry.poster) {
    console.error('ArchiveEntryPage: Entry missing required fields:', entry._id);
    notFound();
  }

  return (
    <ErrorBoundary fallback={ArchiveEntryErrorFallback}>
      <ArchiveEntryBackdrop>
        <div className={styles.archiveEntryContentWrapper}>
          <ArchiveEntryArticle entry={entry} />
        </div>
        <aside className={styles.archiveEntryAside}>
          <ArchiveEntryMetadata entry={entry} />
        </aside>
      </ArchiveEntryBackdrop>
    </ErrorBoundary>
  );
}
