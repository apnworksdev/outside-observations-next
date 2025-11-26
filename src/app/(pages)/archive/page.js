import ArchiveListContent from '@/app/_components/Archive/ArchiveListContent';
import { ErrorBoundary } from '@/app/_components/ErrorBoundary';
import { ArchiveErrorFallback } from '@/app/_components/ErrorFallbacks';

// Enable ISR - revalidate every 60 seconds
export const revalidate = 60;

// Generate metadata for better SEO (cached)
export async function generateMetadata() {
  try {
    return {
      title: 'Outside Observation - Archive',
      description: 'Browse archive entries from Outside Observation',
      openGraph: {
        title: 'Outside Observation - Archive',
        description: 'Browse archive entries from Outside Observation',
        type: 'website',
      },
    };
  } catch (error) {
    console.error('Failed to generate metadata for archive page:', error);
    // Return default metadata on error
    return {
      title: 'Outside Observation - Archive',
      description: 'Browse archive entries from Outside Observation',
    };
  }
}

export default function Archive() {
  return (
    <ErrorBoundary fallback={ArchiveErrorFallback}>
      <ArchiveListContent />
    </ErrorBoundary>
  );
}