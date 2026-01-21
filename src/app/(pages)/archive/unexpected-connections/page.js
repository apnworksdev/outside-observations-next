import { getTwoRandomForUnexpectedConnections } from '@app/_data/unexpectedConnections';
import UnexpectedConnectionsContent from '@app/_components/Archive/UnexpectedConnectionsContent';
import UnexpectedConnectionsEmpty from '@app/_components/Archive/UnexpectedConnectionsEmpty';

export const metadata = {
  title: 'Unexpected Connections - Outside Observation',
  description: 'Explore unexpected connections within the archive.',
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
