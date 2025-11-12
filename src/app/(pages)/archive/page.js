import ArchiveListContent from '@/app/_components/Archive/ArchiveListContent';

// Enable ISR - revalidate every 60 seconds
export const revalidate = 60;

// Generate metadata for better SEO (cached)
export async function generateMetadata() {
  return {
    title: 'Outside Observation - Archive',
    description: 'Browse archive entries from Outside Observation',
    openGraph: {
      title: 'Outside Observation - Archive',
      description: 'Browse archive entries from Outside Observation',
      type: 'website',
    },
  };
}

export default function Archive() {
  return <ArchiveListContent />;
}