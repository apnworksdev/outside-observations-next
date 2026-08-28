import { getSitemapEntries } from '@/app/_data/archive';
import { client } from '@/sanity/lib/client';
import { WRITINGS_LIST_QUERY } from '@/sanity/lib/queries';
import { SITE_URL } from '@/lib/siteUrl';

export const revalidate = 60;

async function getWritingRoutes() {
  try {
    const articles = await client.fetch(WRITINGS_LIST_QUERY);
    if (!Array.isArray(articles)) return [];
    return articles
      .filter((article) => article?.slug)
      .map((article) => ({
        url: `${SITE_URL}/writings/${article.slug}`,
        changeFrequency: 'monthly',
        priority: 0.7,
      }));
  } catch {
    return [];
  }
}

export default async function sitemap() {
  const [entries, writingRoutes] = await Promise.all([getSitemapEntries(), getWritingRoutes()]);

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
      url: `${SITE_URL}/writings`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/privacy`,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // Deliberately no <image:image> tags: entry pages are indexed, image files
  // are not (see the robots policy).
  const entryRoutes = entries
    .filter((entry) => entry?.slug && typeof entry.slug === 'string')
    .map((entry) => ({
      url: `${SITE_URL}/archive/entry/${entry.slug}`,
      changeFrequency: 'weekly',
      priority: 0.6,
      ...(entry._updatedAt ? { lastModified: entry._updatedAt } : {}),
    }));

  return [...staticRoutes, ...writingRoutes, ...entryRoutes];
}
