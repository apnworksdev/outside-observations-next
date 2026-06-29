import { getSitemapEntries } from '@/app/_data/archive';
import { urlFor } from '@/sanity/lib/image';
import { SITE_URL } from '@/lib/siteUrl';

export const revalidate = 60;

function resolvePosterImage(entry) {
  const imageSource = entry?.poster || entry?.previewImage;
  if (!imageSource?.asset?._ref) {
    return null;
  }
  try {
    return urlFor(imageSource).width(1200).quality(85).url();
  } catch {
    return null;
  }
}

export default async function sitemap() {
  const entries = await getSitemapEntries();

  const staticRoutes = [
    {
      url: SITE_URL,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/archive`,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/privacy`,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  const entryRoutes = entries
    .filter((entry) => entry?.slug && typeof entry.slug === 'string')
    .map((entry) => {
      const imageUrl = resolvePosterImage(entry);
      const title = entry.artName || 'Archive entry';

      return {
        url: `${SITE_URL}/archive/entry/${entry.slug}`,
        changeFrequency: 'weekly',
        priority: 0.6,
        ...(entry._updatedAt ? { lastModified: entry._updatedAt } : {}),
        ...(imageUrl
          ? {
              images: [{ url: imageUrl, title }],
            }
          : {}),
      };
    });

  return [...staticRoutes, ...entryRoutes];
}
