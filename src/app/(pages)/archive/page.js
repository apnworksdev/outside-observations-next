import ArchiveListContent from '@/app/_components/Archive/features/list/ArchiveListContent';
import { ErrorBoundary } from '@/app/_components/shared/error/ErrorBoundary';
import { ArchiveErrorFallback } from '@/app/_components/shared/error/ErrorFallbacks';
import { SITE_NAME, SITE_URL } from '@/lib/siteUrl';

// Enable ISR - revalidate every 60 seconds
export const revalidate = 60;

// Generate metadata for better SEO (cached)
export async function generateMetadata() {
  const baseUrl = SITE_URL;
  const canonicalUrl = `${baseUrl}/archive`;
  const title = `Archive | ${SITE_NAME}`;
  const description = `Browse and explore archive entries from ${SITE_NAME}.`;

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
          alt: `${SITE_NAME} - Archive`,
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