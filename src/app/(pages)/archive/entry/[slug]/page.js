import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { Suspense } from 'react';
import { client } from '@/sanity/lib/client';
import { ARCHIVE_ENTRY_QUERY, ARCHIVE_ENTRY_SLUGS } from '@/sanity/lib/queries';
import styles from '@app/_assets/archive/archive-entry.module.css';
import { ArchiveEntryArticle, ArchiveEntryMetadata } from '@/app/_components/Archive/ArchiveEntryContent';
import ArchiveEntryBackdrop from '@/app/_components/Archive/ArchiveEntryBackdrop';
import { ErrorBoundary } from '@/app/_components/ErrorBoundary';
import { ArchiveEntryErrorFallback } from '@/app/_components/ErrorFallbacks';

// Enable ISR - revalidate every 60 seconds
export const revalidate = 60;

/**
 * Fetches a single archive entry with error handling
 * Returns null on error to allow notFound() to be called
 */
const fetchArchiveEntry = async (slug) => {
  try {
    const entry = await client.fetch(ARCHIVE_ENTRY_QUERY, { slug });
    return entry;
  } catch (error) {
    console.error('Failed to fetch archive entry:', error);
    return null;
  }
};

/**
 * Cached version of fetchArchiveEntry
 * Cache key includes the slug to ensure proper cache invalidation per entry
 */
const getCachedArchiveEntry = (slug) => {
  return unstable_cache(
    async () => fetchArchiveEntry(slug),
    [`archive-entry-${slug}`],
    { revalidate: 60 }
  )();
};

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
    // Use cached fetch for better performance
    entry = await getCachedArchiveEntry(resolvedParams.slug);
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
      <Suspense
        fallback={
          <div className={styles.archiveEntryContentWrapper}>
            <ArchiveEntryArticle entry={entry} />
          </div>
        }
      >
        <ArchiveEntryBackdrop>
          <div className={styles.archiveEntryContentWrapper}>
            <ArchiveEntryArticle entry={entry} />
          </div>
          <aside className={styles.archiveEntryAside}>
            <ArchiveEntryMetadata entry={entry} />
          </aside>
        </ArchiveEntryBackdrop>
      </Suspense>
    </ErrorBoundary>
  );
}
