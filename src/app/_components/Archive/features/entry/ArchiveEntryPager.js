'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import styles from '@app/_assets/archive/archive-entry.module.css';
import { useArchiveEntriesSafe } from '@/app/_components/Archive/providers/ArchiveEntriesProvider';

function getEntrySlug(entry) {
  return entry?.metadata?.slug?.current || entry?.slug?.current || null;
}

function buildEntryHref(entry) {
  if (entry?.kind === 'widlineMedia') {
    const index = Number.isInteger(entry.widlineMediaIndex) ? entry.widlineMediaIndex : 0;
    return `/archive/widline-cadet?media=${index}`;
  }

  const slug = getEntrySlug(entry);
  if (!slug) {
    return null;
  }

  return entry.mediaType === 'visualEssay'
    ? `/archive/entry/${slug}?image=0`
    : `/archive/entry/${slug}`;
}

function findNeighbourHref(entries, fromIndex, step) {
  for (let i = fromIndex + step; i >= 0 && i < entries.length; i += step) {
    const href = buildEntryHref(entries[i]);
    if (href) {
      return href;
    }
  }

  return null;
}

export default function ArchiveEntryPager({ slug }) {
  const archive = useArchiveEntriesSafe();
  const router = useRouter();

  const entries = useMemo(() => archive?.visibleEntries ?? [], [archive?.visibleEntries]);
  const { hasMore, isLoadingMore, loadMore } = archive ?? {};

  const currentIndex = useMemo(
    () => entries.findIndex((entry) => getEntrySlug(entry) === slug),
    [entries, slug]
  );

  const previousHref = useMemo(
    () => (currentIndex < 0 ? null : findNeighbourHref(entries, currentIndex, -1)),
    [entries, currentIndex]
  );
  const nextHref = useMemo(
    () => (currentIndex < 0 ? null : findNeighbourHref(entries, currentIndex, 1)),
    [entries, currentIndex]
  );

  const lookaheadRef = useRef(0);
  const MAX_LOOKAHEAD_PAGES = 3;

  useEffect(() => {
    if (typeof loadMore !== 'function' || !hasMore || isLoadingMore) {
      return;
    }

    if (currentIndex >= 0) {
      lookaheadRef.current = 0;
      if (currentIndex >= entries.length - 2) {
        loadMore();
      }
      return;
    }

    if (entries.length > 0 && lookaheadRef.current < MAX_LOOKAHEAD_PAGES) {
      lookaheadRef.current += 1;
      loadMore();
    }
  }, [currentIndex, entries.length, hasMore, isLoadingMore, loadMore]);

  const goTo = useCallback(
    (href) => {
      if (href) {
        router.push(href);
      }
    },
    [router]
  );

  const swipeStartRef = useRef(null);

  useEffect(() => {
    const SWIPE_MIN_DISTANCE = 60;
    const SWIPE_MAX_VERTICAL_RATIO = 0.6;

    const isSwipeCapable = (event) =>
      event.pointerType === 'touch' ||
      event.pointerType === 'pen' ||
      window.matchMedia('(pointer: coarse)').matches;

    const handlePointerDown = (event) => {
      if (!event.isPrimary || !isSwipeCapable(event)) {
        swipeStartRef.current = null;
        return;
      }
      swipeStartRef.current = { x: event.clientX, y: event.clientY };
    };

    const handlePointerUp = (event) => {
      const start = swipeStartRef.current;
      swipeStartRef.current = null;
      if (!start) {
        return;
      }

      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;

      if (Math.abs(deltaX) < SWIPE_MIN_DISTANCE) {
        return;
      }
      if (Math.abs(deltaY) > Math.abs(deltaX) * SWIPE_MAX_VERTICAL_RATIO) {
        return;
      }

      goTo(deltaX < 0 ? nextHref : previousHref);
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', () => { swipeStartRef.current = null; }, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [goTo, previousHref, nextHref]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target;
      const isTyping =
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if (isTyping) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goTo(previousHref);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goTo(nextHref);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goTo, previousHref, nextHref]);

  if (!archive || currentIndex < 0) {
    return null;
  }

  return (
    <nav className={styles.archiveEntryPager} aria-label="Archive entry navigation">
      {previousHref ? (
        <Link
          href={previousHref}
          className={`${styles.archiveEntryPagerButton} ${styles.archiveEntryPagerPrevious}`}
          data-transition="nav"
          aria-label="Previous entry"
          rel="prev"
        />
      ) : (
        <span
          className={`${styles.archiveEntryPagerButton} ${styles.archiveEntryPagerPrevious}`}
          data-disabled="true"
          aria-hidden="true"
        />
      )}
      {nextHref ? (
        <Link
          href={nextHref}
          className={`${styles.archiveEntryPagerButton} ${styles.archiveEntryPagerNext}`}
          data-transition="nav"
          aria-label="Next entry"
          rel="next"
        />
      ) : (
        <span
          className={`${styles.archiveEntryPagerButton} ${styles.archiveEntryPagerNext}`}
          data-disabled="true"
          aria-hidden="true"
        />
      )}
    </nav>
  );
}
