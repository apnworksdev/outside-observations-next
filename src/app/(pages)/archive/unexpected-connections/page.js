import { getTwoRandomForUnexpectedConnections } from '@app/_data/unexpectedConnections';
import UnexpectedConnectionsContent from '@app/_components/Archive/UnexpectedConnectionsContent';
import UnexpectedConnectionsEmpty from '@app/_components/Archive/UnexpectedConnectionsEmpty';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://outside-observation.com';

export const metadata = {
  title: 'Unexpected Connections | Outside Observation',
  description:
    'Explore unexpected connections between archive entries. Discover new pairings from Outside Observation.',
  openGraph: {
    title: 'Unexpected Connections | Outside Observation',
    description:
      'Explore unexpected connections between archive entries. Discover new pairings from Outside Observation.',
    type: 'website',
    url: `${baseUrl}/archive/unexpected-connections`,
    images: [
      {
        url: `${baseUrl}/share-image.png`,
        width: 1200,
        height: 630,
        alt: 'Outside Observation - Unexpected Connections',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Unexpected Connections | Outside Observation',
    description:
      'Explore unexpected connections between archive entries. Discover new pairings from Outside Observation.',
    images: [`${baseUrl}/share-image.png`],
  },
  alternates: {
    canonical: `${baseUrl}/archive/unexpected-connections`,
  },
};

export const revalidate = 0;

export default async function UnexpectedConnectionsPage() {
  const mediaWidth = 600;
  const { preparedItems, comparisonPayload } = await getTwoRandomForUnexpectedConnections({
    mediaWidth,
  });

  if (!preparedItems?.length) {
    return <UnexpectedConnectionsEmpty message="No eligible items in the pool." />;
  }

  return (
    <UnexpectedConnectionsContent
      items={preparedItems}
      comparisonPayload={comparisonPayload}
      mediaWidth={mediaWidth}
    />
  );
}
