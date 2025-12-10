import { urlFor } from '@/sanity/lib/image';
import { getRandomArchivePosters } from '@app/_data/archive';
import UnexpectedConnectionsContent from '@app/_components/Archive/UnexpectedConnectionsContent';

export const metadata = {
  title: 'Unexpected Connections - Outside Observation',
  description: 'Explore unexpected connections within the archive.',
};

export const revalidate = 0;

export default async function UnexpectedConnectionsPage() {
  const posters = await getRandomArchivePosters(2);
  const posterWidth = 600;

  if (!posters || posters.length === 0) {
    return (
      <section>
        <p>No archive posters available yet.</p>
      </section>
    );
  }

  const preparedPosters = posters
    .filter((entry) => entry?.poster?.asset?._ref)
    .map((entry) => {
      const aspectRatio = entry.poster?.dimensions?.aspectRatio || 1;
      const calculatedHeight = Math.round(posterWidth / aspectRatio);
      const imageUrl = urlFor(entry.poster).width(posterWidth).url();
      const moodTags = Array.isArray(entry.tags)
        ? entry.tags.map((tag) => tag?.name).filter(Boolean)
        : [];
      const description =
        typeof entry.aiDescription === 'string' && entry.aiDescription.trim().length > 0
          ? entry.aiDescription.trim()
          : null;

      return {
        entry,
        imageUrl,
        calculatedHeight,
        moodTags,
        description,
      };
    });

  const comparisonPayload =
    preparedPosters.length >= 2
      ? {
          item1: {
            id: preparedPosters[0].entry._id,
            name: preparedPosters[0].entry.artName ?? 'Archive Entry',
            description:
              preparedPosters[0].description ??
              `Archive entry ${preparedPosters[0].entry.artName ?? preparedPosters[0].entry._id}`,
            mood_tags: preparedPosters[0].moodTags,
          },
          item2: {
            id: preparedPosters[1].entry._id,
            name: preparedPosters[1].entry.artName ?? 'Archive Entry',
            description:
              preparedPosters[1].description ??
              `Archive entry ${preparedPosters[1].entry.artName ?? preparedPosters[1].entry._id}`,
            mood_tags: preparedPosters[1].moodTags,
          },
        }
      : null;

  return (
    <UnexpectedConnectionsContent
      posters={preparedPosters}
      comparisonPayload={comparisonPayload}
      posterWidth={posterWidth}
    />
  );
}


