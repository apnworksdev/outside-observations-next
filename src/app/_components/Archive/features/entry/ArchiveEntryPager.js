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

/** Nearest entry in `step` direction that can actually be linked to. */
function findNeighbourHref(entries, fromIndex, step) {
  for (let i = fromIndex + step; i >= 0 && i < entries.length; i += step) {
    const href = buildEntryHref(entries[i]);
    if (href) {
      return href;
    }
  }

  return null;
}

/**
 * Previous / next navigation between entries, without going back to the grid.
 *
 * It walks `visibleEntries`, i.e. the archive list as the visitor currently
 * filtered and sorted it, so search, moods and sorting stay in effect while
 * paging. Reaching the end of the loaded page triggers the same `loadMore`
 * the grid uses, so paging can continue past the first batch.
 */
export default function ArchiveEntryPager({ slug }) {
  const archive = useArchiveEntriesSafe();
  const router = useRouter();

  // Memoised so the fallback array does not change identity on every render.
  const entries = useMemo(() => archive?.visibleEntries ?? [], [archive?.visibleEntries]);
  const { hasMore, isLoadingMore, loadMore } = archive ?? {};

  const currentIndex = useMemo(
    () => entries.findIndex((entry) => getEntrySlug(entry) === slug),
    [entries, slug]
  );

  // Some rows (visual-essay images, Widline media) carry no slug, so walk past
  // them instead of dead-ending the arrows.
  const previousHref = useMemo(
    () => (currentIndex < 0 ? null : findNeighbourHref(entries, currentIndex, -1)),
    [entries, currentIndex]
  );
  const nextHref = useMemo(
    () => (currentIndex < 0 ? null : findNeighbourHref(entries, currentIndex, 1)),
    [entries, currentIndex]
  );

  // How many extra pages we are willing to pull when the visitor lands straight
  // on an entry (shared link) that is not in the first loaded page.
  const lookaheadRef = useRef(0);
  const MAX_LOOKAHEAD_PAGES = 3;

  useEffect(() => {
    if (typeof loadMore !== 'function' || !hasMore || isLoadingMore) {
      return;
    }

    if (currentIndex >= 0) {
      lookaheadRef.current = 0;
      // Near the end of what is loaded: fetch ahead so "next" stays available.
      if (currentIndex >= entries.length - 2) {
        loadMore();
      }
      return;
    }

    // Entry not in the loaded list yet: look a little further before giving up.
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

  // Swipe: pointer events cover real touch, pen, and Chrome's device emulation
  // (which does not always dispatch touch events, depending on the device-type
  // setting in the device toolbar).
  const swipeStartRef = useRef(null);

  useEffect(() => {
    const SWIPE_MIN_DISTANCE = 60;
    // Ignore mostly-vertical moves so page scrolling still works.
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

  // Outside the archive list context there is nothing to page through.
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
