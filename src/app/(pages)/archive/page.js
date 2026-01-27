import ArchiveListContent from '@/app/_components/Archive/ArchiveListContent';
import { ErrorBoundary } from '@/app/_components/ErrorBoundary';
import { ArchiveErrorFallback } from '@/app/_components/ErrorFallbacks';

// Enable ISR - revalidate every 60 seconds
export const revalidate = 60;

// Generate metadata for better SEO (cached)
export async function generateMetadata() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://outside-observation.com';
  const canonicalUrl = `${baseUrl}/archive`;
  const title = 'Archive | Outside Observation';
  const description = 'Browse and explore archive entries from Outside Observation.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonicalUrl,
      images: [
        {
          url: `${baseUrl}/share-image.png`,
          width: 1200,
          height: 630,
          alt: 'Outside Observation - Archive',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${baseUrl}/share-image.png`],
    },
    alternates: { canonical: canonicalUrl },
  };
}

export default function Archive() {
  return (
    <ErrorBoundary fallback={ArchiveErrorFallback}>
      <ArchiveListContent />
    </ErrorBoundary>
  );
}