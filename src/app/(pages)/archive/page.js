import ArchiveList from '@/app/_components/Archive/ArchiveList';

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

export default async function Archive({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const view = resolvedSearchParams?.view === 'images' ? 'images' : 'list';
  return <ArchiveList view={view} />;
};