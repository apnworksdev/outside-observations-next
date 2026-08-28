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

  const artistName = entry?.metadata?.source || entry?.source || null;
  const creditText = entry?.metadata?.credit || null;
  const keywords = [
    ...(entry?.metadata?.tags?.map((tag) => tag?.name) ?? []),
    ...(entry?.aiMoodTags?.map((tag) => tag?.name) ?? []),
  ].filter(Boolean);

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
    creator: artistName
      ? { '@type': 'Person', name: artistName }
      : { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    ...(creditText ? { creditText } : {}),
    ...(artistName ? { copyrightNotice: `© ${artistName}` } : {}),
    ...(keywords.length > 0 ? { keywords: keywords.join(', ') } : {}),
    isPartOf: {
      '@type': 'CollectionPage',
      name: `${SITE_NAME} Archive`,
      url: `${SITE_URL}/archive`,
    },
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Archive', item: `${SITE_URL}/archive` },
      { '@type': 'ListItem', position: 2, name: artName, item: canonicalUrl },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
    </>
  );
}
