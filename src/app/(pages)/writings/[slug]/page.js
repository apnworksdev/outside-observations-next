import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { client } from '@/sanity/lib/client';
import {
  WRITING_ARTICLE_QUERY,
  WRITING_ARTICLE_SLUGS_QUERY,
  WRITINGS_LIST_QUERY,
} from '@/sanity/lib/queries';
import { SITE_NAME, SITE_URL } from '@/lib/siteUrl';
import styles from '@app/_assets/writings/writings-article.module.css';
import { ErrorBoundary } from '@/app/_components/shared/error/ErrorBoundary';
import WritingsReader from '@/app/_components/Writings/WritingsReader';
import WritingsScrollReset from '@/app/_components/Writings/WritingsScrollReset';

export const revalidate = 60;

const getCachedArticle = (slug) =>
  unstable_cache(
    async () => {
      try {
        return await client.fetch(WRITING_ARTICLE_QUERY, { slug });
      } catch (error) {
        console.error('Failed to fetch writing article:', error);
        return null;
      }
    },
    [`writing-article-${slug}`],
    { revalidate: 60 }
  )();

const getCachedOrder = unstable_cache(
  async () => {
    try {
      const articles = await client.fetch(WRITINGS_LIST_QUERY);
      return Array.isArray(articles) ? articles : [];
    } catch (error) {
      console.error('Failed to fetch writings order:', error);
      return [];
    }
  },
  ['writings-order'],
  { revalidate: 60 }
);

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = slug ? await getCachedArticle(slug) : null;
  if (!article) return { title: SITE_NAME };

  const title = `${article.title} | ${SITE_NAME}`;
  const description = article.excerpt || `${article.title} — by ${article.author?.name ?? SITE_NAME}.`;
  const canonicalUrl = `${SITE_URL}/writings/${article.slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonicalUrl,
      ...(article.publishedAt ? { publishedTime: article.publishedAt } : {}),
      images: [{ url: `${SITE_URL}/share-image.png`, width: 1200, height: 630, alt: article.title }],
    },
    alternates: { canonical: canonicalUrl },
  };
}

export async function generateStaticParams() {
  try {
    const slugs = await client.fetch(WRITING_ARTICLE_SLUGS_QUERY);
    if (!Array.isArray(slugs)) return [];
    return slugs.filter(Boolean).map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

function ArticleJsonLd({ article }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    ...(article.excerpt ? { description: article.excerpt } : {}),
    url: `${SITE_URL}/writings/${article.slug}`,
    ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
    ...(article._updatedAt ? { dateModified: article._updatedAt } : {}),
    author: article.author?.name
      ? {
          '@type': 'Person',
          name: article.author.name,
          ...(article.author.link ? { url: article.author.link } : {}),
        }
      : undefined,
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    isPartOf: {
      '@type': 'CollectionPage',
      name: `${SITE_NAME} — Writings`,
      url: `${SITE_URL}/writings`,
    },
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );
}

export default async function WritingArticlePage({ params }) {
  const { slug } = await params;
  if (!slug) notFound();

  const [article, order] = await Promise.all([getCachedArticle(slug), getCachedOrder()]);
  if (!article) notFound();

  return (
    <ErrorBoundary>
      <ArticleJsonLd article={article} />
      <WritingsScrollReset />
      <main className={styles.container}>
        <WritingsReader initialArticle={article} order={order} />
      </main>
    </ErrorBoundary>
  );
}
