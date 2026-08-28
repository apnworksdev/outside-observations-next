import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { Suspense } from 'react';
import { client } from '@/sanity/lib/client';
import { ARCHIVE_ENTRY_QUERY, ARCHIVE_ENTRY_SLUGS, ARCHIVE_ENTRY_ORDER_QUERY } from '@/sanity/lib/queries';
import { urlFor } from '@/sanity/lib/image';
import styles from '@app/_assets/archive/archive-entry.module.css';
import { ArchiveEntryArticle, ArchiveEntryMetadata } from '@/app/_components/Archive/features/entry/ArchiveEntryContent';
import ArchiveEntryBackdrop from '@/app/_components/Archive/features/entry/ArchiveEntryBackdrop';
import ArchiveEntryJsonLd from '@/app/_components/Archive/features/entry/ArchiveEntryJsonLd';
import ArchiveEntryVisitTracker from '@/app/_components/Archive/features/entry/ArchiveEntryVisitTracker';
import ArchiveEntryPager from '@/app/_components/Archive/features/entry/ArchiveEntryPager';
import { ErrorBoundary } from '@/app/_components/shared/error/ErrorBoundary';
import { ArchiveEntryErrorFallback } from '@/app/_components/shared/error/ErrorFallbacks';
import { SITE_NAME, SITE_URL } from '@/lib/siteUrl';

const META_DESCRIPTION_MAX_LENGTH = 160;

function truncateDescription(text) {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (trimmed.length <= META_DESCRIPTION_MAX_LENGTH) return trimmed;
  const cut = trimmed.slice(0, META_DESCRIPTION_MAX_LENGTH - 1).trim();
  const lastSpace = cut.lastIndexOf(' ');
  return lastSpace > 0 ? cut.slice(0, lastSpace) + '…' : cut + '…';
}

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
const getCachedEntryOrder = unstable_cache(
  async () => {
    try {
      return await client.fetch(ARCHIVE_ENTRY_ORDER_QUERY);
    } catch (error) {
      console.error('Failed to fetch archive entry order:', error);
      return [];
    }
  },
  ['archive-entry-order'],
  { revalidate: 60 }
);

const getCachedArchiveEntry = (slug) => {
  return unstable_cache(
    async () => fetchArchiveEntry(slug),
    [`archive-entry-${slug}`],
    { revalidate: 60 }
  )();
};

export async function generateMetadata({ params }) {
  let slug;
  try {
    const resolved = await params;
    slug = resolved?.slug;
  } catch {
    return { title: SITE_NAME };
  }
  if (!slug) return { title: SITE_NAME };

  let entry;
  try {
    entry = await getCachedArchiveEntry(slug);
  } catch {
    return { title: SITE_NAME };
  }
  if (!entry) return { title: SITE_NAME };

  const artName = entry.metadata?.artName || entry.artName || 'Archive entry';
  const title = `${artName} | ${SITE_NAME}`;

  const rawDescription =
    entry.aiDescription ||
    [artName, entry.metadata?.source || entry.source, entry.metadata?.year?.value ?? entry.year]
      .filter(Boolean)
      .join(' · ');
  const description = truncateDescription(rawDescription);

  const baseUrl = SITE_URL;
  const canonicalSlug = entry.metadata?.slug?.current || entry.slug?.current || slug;
  const canonicalUrl = `${baseUrl}/archive/entry/${canonicalSlug}`;

  let ogImageUrl = null;
  const poster = entry.poster;
  const firstVisualImage = entry.visualEssayImages?.[0]?.image;
  const imageSource = poster || firstVisualImage;
  if (imageSource?.asset?._ref) {
    try {
      ogImageUrl = urlFor(imageSource).width(1200).height(630).quality(85).fit('max').url();
    } catch {
      // ignore
    }
  }
  if (!ogImageUrl) {
    ogImageUrl = `${baseUrl}/share-image.png`;
  }

  return {
    title,
    description: description || undefined,
    openGraph: {
      title,
      description: description || undefined,
      type: 'article',
      url: canonicalUrl,
      ...(entry._createdAt ? { publishedTime: entry._createdAt } : {}),
      ...(entry._updatedAt ? { modifiedTime: entry._updatedAt } : {}),
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: artName,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description || undefined,
      images: [ogImageUrl],
    },
    alternates: { canonical: canonicalUrl },
    robots: {
      index: true,
      follow: true,
      ...(entry.allowImageIndexing
        ? {}
        : { noimageindex: true, 'max-image-preview': 'none' }),
    },
  };
}

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
  if (!entry.metadata?.artName && !entry.artName && !entry.poster) {
    console.error('ArchiveEntryPage: Entry missing required fields:', entry._id);
    notFound();
  }

  const entryType = entry?.mediaType || 'image';
  const entrySlug = resolvedParams.slug;

  let neighbours = null;
  try {
    const order = await getCachedEntryOrder();
    const canonical = entry.metadata?.slug?.current || entry.slug?.current || entrySlug;
    const index = Array.isArray(order) ? order.indexOf(canonical) : -1;
    if (index >= 0) {
      neighbours = {
        previous: index > 0 ? { slug: order[index - 1] } : null,
        next: index < order.length - 1 ? { slug: order[index + 1] } : null,
      };
    }
  } catch {
    neighbours = null;
  }

  return (
    <ErrorBoundary fallback={ArchiveEntryErrorFallback}>
      {neighbours?.previous?.slug ? (
        <link rel="prev" href={`${SITE_URL}/archive/entry/${neighbours.previous.slug}`} />
      ) : null}
      {neighbours?.next?.slug ? (
        <link rel="next" href={`${SITE_URL}/archive/entry/${neighbours.next.slug}`} />
      ) : null}
      <ArchiveEntryJsonLd entry={entry} slug={entrySlug} />
      <ArchiveEntryVisitTracker slug={entrySlug} />
      <Suspense
        fallback={
          <div className={styles.archiveEntryContentWrapper} data-entry-type={entryType}>
            <ArchiveEntryArticle entry={entry} />
          </div>
        }
      >
        <ArchiveEntryBackdrop entry={entry}>
          <button className={styles.archiveEntryCloseButton}>
            Close
          </button>
          <div className={styles.archiveEntryContentWrapper} data-entry-type={entryType}>
            <ArchiveEntryArticle entry={entry} />
          </div>
          <ArchiveEntryPager slug={entrySlug} />
          <aside className={styles.archiveEntryAside}>
            <ArchiveEntryMetadata entry={entry} />
          </aside>
        </ArchiveEntryBackdrop>
      </Suspense>
    </ErrorBoundary>
  );
}
