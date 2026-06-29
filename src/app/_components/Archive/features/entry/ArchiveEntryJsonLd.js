import { urlFor } from '@/sanity/lib/image';
import { SITE_NAME, SITE_URL } from '@/lib/siteUrl';

function resolveArtName(entry) {
  return entry?.metadata?.artName || entry?.artName || 'Archive entry';
}

function resolveDescription(entry) {
  const artName = resolveArtName(entry);
  return (
    entry?.aiDescription ||
    [artName, entry?.metadata?.source || entry?.source, entry?.metadata?.year?.value ?? entry?.year]
      .filter(Boolean)
      .join(' · ')
  );
}

function resolveImageUrl(entry) {
  const poster = entry?.poster;
  const firstVisualImage = entry?.visualEssayImages?.[0]?.image;
  const imageSource = poster || firstVisualImage;
  if (!imageSource?.asset?._ref) {
    return null;
  }
  try {
    return urlFor(imageSource).width(1200).quality(85).fit('max').url();
  } catch {
    return null;
  }
}

function resolveSchemaType(mediaType) {
  if (mediaType === 'visualEssay') {
    return 'Article';
  }
  return 'VisualArtwork';
}

export default function ArchiveEntryJsonLd({ entry, slug }) {
  if (!entry || !slug) {
    return null;
  }

  const artName = resolveArtName(entry);
  const description = resolveDescription(entry);
  const imageUrl = resolveImageUrl(entry);
  const canonicalUrl = `${SITE_URL}/archive/entry/${slug}`;
  const year = entry?.metadata?.year?.value ?? entry?.year;
  const mediaType = entry?.mediaType || 'image';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': resolveSchemaType(mediaType),
    name: artName,
    ...(description ? { description } : {}),
    ...(imageUrl ? { image: imageUrl } : {}),
    url: canonicalUrl,
    ...(year ? { dateCreated: String(year) } : {}),
    ...(entry._createdAt ? { datePublished: entry._createdAt } : {}),
    ...(entry._updatedAt ? { dateModified: entry._updatedAt } : {}),
    creator: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
