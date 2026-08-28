'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { SITE_NAME } from '@/lib/siteUrl';
import { saveReadingProgress } from '@/app/_helpers/storage/readingProgress';
import WritingArticleBody from './WritingArticleBody';

/**
 * Continuous reader.
 *
 * The closing band of each article already announces the next one; scrolling
 * past it appends that article in place. The address bar follows whichever
 * article fills the viewport (history.replaceState, so no navigation and no
 * page transition), which keeps every article linkable and reloadable while
 * reading feels like one uninterrupted scroll.
 */
export default function WritingsReader({ initialArticle, order }) {
  const [articles, setArticles] = useState([initialArticle]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef(null);
  const loadedSlugsRef = useRef(new Set([initialArticle.slug]));
  const currentSlugRef = useRef(initialArticle.slug);

  const slugList = order.map((item) => item.slug);
  const lastSlug = articles[articles.length - 1]?.slug;
  const nextIndex = slugList.indexOf(lastSlug) + 1;
  const nextSummary = nextIndex > 0 && nextIndex < order.length ? order[nextIndex] : null;

  const loadNext = useCallback(async () => {
    if (!nextSummary || isLoading || loadedSlugsRef.current.has(nextSummary.slug)) {
      return;
    }

    setIsLoading(true);
    loadedSlugsRef.current.add(nextSummary.slug);

    try {
      const response = await fetch(`/api/writings/${nextSummary.slug}`);
      if (!response.ok) {
        throw new Error(`Failed with status ${response.status}`);
      }
      const { article } = await response.json();
      if (article) {
        setArticles((previous) => [...previous, article]);
      }
    } catch (error) {
      loadedSlugsRef.current.delete(nextSummary.slug);
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to append next article:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [nextSummary, isLoading]);

  // Append the next article shortly before the end of the current one.
  // Listeners go on `document`, not `window`: on these pages the <body> is the
  // scrolling element, and its scroll events never reach window.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !nextSummary) {
      return undefined;
    }

    const THRESHOLD = 800;

    const checkPosition = () => {
      const nodes = container.querySelectorAll('[data-slug]');
      const last = nodes[nodes.length - 1];
      if (!last) {
        return;
      }
      // Viewport-relative, so it does not matter which element scrolls.
      if (last.getBoundingClientRect().bottom - window.innerHeight < THRESHOLD) {
        loadNext();
      }
    };

    checkPosition();
    document.addEventListener('scroll', checkPosition, { passive: true, capture: true });
    window.addEventListener('resize', checkPosition, { passive: true });

    return () => {
      document.removeEventListener('scroll', checkPosition, { capture: true });
      window.removeEventListener('resize', checkPosition);
    };
  }, [loadNext, nextSummary]);

  // The URL and document title follow the article currently being read. Ratio
  // thresholds are no help here (an article is far taller than the viewport), so
  // we simply look for the article crossing the middle of the screen.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const syncLocation = () => {
      const middle = window.innerHeight / 2;
      let current = null;

      container.querySelectorAll('[data-slug]').forEach((node) => {
        const rect = node.getBoundingClientRect();
        if (rect.top <= middle && rect.bottom > middle) {
          current = node.dataset.slug;
          // Reading progress: how much of this article has passed the bottom
          // of the viewport. Only the highest value is kept, so scrolling back
          // up never regresses the bookmark.
          if (rect.height > 0) {
            saveReadingProgress(
              current,
              ((window.innerHeight - rect.top) / rect.height) * 100
            );
          }
        }
      });

      if (!current || current === currentSlugRef.current) {
        return;
      }

      currentSlugRef.current = current;
      const article = articles.find((item) => item.slug === current);
      window.history.replaceState(window.history.state, '', `/writings/${current}`);
      if (article?.title) {
        document.title = `${article.title} | ${SITE_NAME}`;
      }
    };

    syncLocation();
    document.addEventListener('scroll', syncLocation, { passive: true, capture: true });
    return () => document.removeEventListener('scroll', syncLocation, { capture: true });
  }, [articles]);

  return (
    <div ref={containerRef}>
      {articles.map((article, index) => {
        const summaryIndex = slugList.indexOf(article.slug) + 1;
        const teaser = summaryIndex > 0 && summaryIndex < order.length ? order[summaryIndex] : null;

        return (
          <WritingArticleBody
            key={article.slug}
            article={article}
            nextArticle={teaser}
            showHeader={index === 0}
          />
        );
      })}
    </div>
  );
}
