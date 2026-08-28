import { getTwoRandomForUnexpectedConnections } from '@app/_data/unexpectedConnections';
import UnexpectedConnectionsContent from '@app/_components/Archive/features/unexpected/UnexpectedConnectionsContent';
import UnexpectedConnectionsEmpty from '@app/_components/Archive/features/unexpected/UnexpectedConnectionsEmpty';
import { SITE_NAME, SITE_URL } from '@/lib/siteUrl';

const baseUrl = SITE_URL;

export const metadata = {
  robots: {
    index: true,
    follow: true,
    noimageindex: true,
    'max-image-preview': 'none',
  },
  title: `Unexpected Connections | ${SITE_NAME}`,
  description:
    `Explore unexpected connections between archive entries. Discover new pairings from ${SITE_NAME}.`,
  openGraph: {
    title: `Unexpected Connections | ${SITE_NAME}`,
    description:
      `Explore unexpected connections between archive entries. Discover new pairings from ${SITE_NAME}.`,
    type: 'website',
    url: `${baseUrl}/archive/unexpected-connections`,
    images: [
      {
        url: `${baseUrl}/share-image.png`,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} - Unexpected Connections`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Unexpected Connections | ${SITE_NAME}`,
    description:
      `Explore unexpected connections between archive entries. Discover new pairings from ${SITE_NAME}.`,
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
