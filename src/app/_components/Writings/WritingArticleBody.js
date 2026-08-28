'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { PortableText } from 'next-sanity';

import styles from '@app/_assets/writings/writings-article.module.css';
import SanityImage from '@/sanity/components/SanityImage';
import HoverImageLink from './HoverImageLink';

/**
 * Fallback column bands for documents authored before the explicit
 * "starts at line" / "width" fields existed.
 */
const LEGACY_POSITIONS = {
  'narrow-left': [2, 2],
  'narrow-center': [5, 3],
  'narrow-right': [9, 2],
  'medium-left': [2, 5],
  'medium-left-indented': [3, 4],
  'medium-center': [5, 5],
  'medium-right': [7, 5],
  wide: [2, 8],
  'wide-indented': [4, 6],
  'two-columns': [3, 8],
  left: [2, 4],
  right: [8, 4],
  center: [5, 4],
};

const COLUMNS = 12;

function columnStyle({ startColumn, columnSpan, position }, fallback) {
  const legacy = LEGACY_POSITIONS[position] || LEGACY_POSITIONS[fallback];
  const start = Number.isFinite(startColumn) ? startColumn : legacy[0];
  const span = Number.isFinite(columnSpan) ? columnSpan : legacy[1];

  const safeSpan = Math.min(Math.max(span, 1), COLUMNS);
  const safeStart = Math.min(Math.max(start, 1), COLUMNS + 1 - safeSpan);

  // Mobile keeps an echo of the desktop collage: blocks span 4 of the 6
  // columns and the two spare columns go where the desktop block leaned --
  // left-leaning blocks sit flush left, centred ones centre, right-leaning
  // ones flush right. Each step is a sixth of the screen: clearly visible.
  const desktopCentre = safeStart + safeSpan / 2;
  const mobileStart = desktopCentre < 5.5 ? 1 : desktopCentre <= 8.5 ? 2 : 3;

  return { '--col-start': safeStart, '--col-end': safeStart + safeSpan, '--col-start-m': mobileStart };
}

const portableComponents = {
  marks: {
    link: ({ value, children }) => (
      <a href={value?.href} target="_blank" rel="noreferrer">
        {children}
      </a>
    ),
    /** Underlined text that reveals its image while hovered. */
    hoverImage: ({ value, children }) => {
      if (!value?.image?.asset) {
        return <span>{children}</span>;
      }

      return (
        <HoverImageLink image={value.image} caption={value.caption}>
          {children}
        </HoverImageLink>
      );
    },
  },
};

export function formatArticleDate(value) {
  if (!value) return null;
  try {
    return new Date(value)
      .toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
      .toUpperCase();
  } catch {
    return null;
  }
}

/**
 * One article: header, collage body, and the closing band whose big title is
 * the *next* article — the visitor scrolls straight into it.
 */
export default function WritingArticleBody({ article, nextArticle, showHeader = true }) {
  const [shareState, setShareState] = useState('idle');
  const shareResetRef = useRef(null);

  /**
   * Share the article: the native share sheet where there is one (mobile,
   * mostly), the clipboard elsewhere -- with a moment of "Link copied" as
   * feedback before the label settles back.
   */
  const handleShare = async () => {
    const url = window.location.href;
    const payload = { title: article?.title || document.title, url };

    if (typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare(payload))) {
      try {
        await navigator.share(payload);
      } catch {
        // Closing the share sheet rejects: nothing to report.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareState('copied');
    } catch {
      setShareState('error');
    }
    if (shareResetRef.current) {
      clearTimeout(shareResetRef.current);
    }
    shareResetRef.current = setTimeout(() => setShareState('idle'), 2000);
  };

  const date = formatArticleDate(article.publishedAt);
  const nextDate = formatArticleDate(nextArticle?.publishedAt);

  return (
    <article className={styles.article} data-slug={article.slug}>
      {/* Appended articles inherit the previous article's closing title block as
          their own heading, so the reader sees one title, not two. */}
      {showHeader ? (
        <header className={styles.header}>
          <h1 className={styles.title}>{article.title}</h1>
          <p className={styles.byline}>
            {article.author?.name}
            {date ? <span className={styles.date}>{date}</span> : null}
          </p>
        </header>
      ) : null}

      <div className={styles.body}>
        {(article.body ?? []).map((section) => {
          if (section._type === 'textSection') {
            return (
              <section
                key={section._key}
                className={styles.textSection}
                data-position={section.position || undefined}
              >
                <div className={styles.sectionInner} style={columnStyle(section, 'wide')}>
                  <PortableText value={section.text} components={portableComponents} />
                </div>
              </section>
            );
          }

          return null;
        })}
      </div>

      <footer className={styles.footer}>
        <nav className={styles.footerNav}>
          <Link href="/writings" data-transition="nav" className={styles.footerNavLeft}>
            See our other articles
          </Link>
          <button type="button" className={`${styles.footerNavCenter} ${styles.footerShare}`} onClick={handleShare}>
            {shareState === 'copied' ? 'Link copied' : shareState === 'error' ? 'Copy failed' : 'Share'}
          </button>
          <span className={styles.footerNavRight}>
            Written by{' '}
            {article.author?.link ? (
              <a href={article.author.link} target="_blank" rel="noreferrer">
                {article.author.name}
              </a>
            ) : (
              article.author?.name
            )}
          </span>
          <span className={styles.footerDot} style={{ '--line': 6 }} aria-hidden="true" />
          <span className={styles.footerDot} style={{ '--line': 9 }} aria-hidden="true" />
        </nav>

        {nextArticle ? (
          <div className={styles.footerTitleBlock}>
            <p className={styles.footerTitle}>{nextArticle.title}</p>
            <p className={styles.footerByline}>
              {nextArticle.authorName}
              {nextDate ? ` — ${nextDate}` : ''}
            </p>
          </div>
        ) : null}
      </footer>
    </article>
  );
}
