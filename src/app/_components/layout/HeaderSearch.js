'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import styles from '@app/_assets/layout/nav.module.css';
import { createArchiveSearchPayload } from '@/app/_components/chat/chatBoxUtils';
import { useArchiveSearchState } from '@/app/_components/Archive/providers/ArchiveSearchStateProvider';
import {
  ARCHIVE_FILTERS_CHANGE_EVENT,
  SESSION_STORAGE_KEYS,
  readFromSessionStorage,
} from '@/app/_components/Archive/state/archiveStorage';

const SEARCH_PARAM = 'search';
const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

function buildArchiveUrl(query) {
  return query ? `/archive?${SEARCH_PARAM}=${encodeURIComponent(query)}` : '/archive';
}

// Payload the provider understands as "no search anymore": the grid goes back
// to the full archive (same shape as an applied search, with the filter off).
const CLEARED_SEARCH_PAYLOAD = {
  resultsState: { active: false, ids: [], orderedIds: [] },
  statusState: { status: 'idle', query: null, summary: null, error: null },
};

/**
 * Header text search.
 *
 * Fires on its own once the visitor stops typing (600ms debounce), mirrors the
 * query into the URL (/archive?search=...) so a search can be linked to or
 * returned to directly, and replays the URL's query on first load.
 *
 * The results reuse the very same payload shape the AI chat produces: the
 * archive provider consumes it and filters the grid, so no display logic is
 * duplicated here.
 */
export default function HeaderSearch() {
  const [value, setValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { setSearchPayload } = useArchiveSearchState();
  const pathname = usePathname();
  const router = useRouter();

  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  const lastQueryRef = useRef(null);
  // Refs so the stable runSearch callback always sees current routing state.
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const runSearch = useCallback(async (query) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearching(true);

    try {
      const response = await fetch('/api/archive-entries/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Search failed with status ${response.status}`);
      }

      const { ids } = await response.json();
      if (controller.signal.aborted) {
        return;
      }

      lastQueryRef.current = query;
      setSearchPayload(createArchiveSearchPayload(Array.isArray(ids) ? ids : [], query));

      // Mirror the query into the URL so the search survives reload/share.
      // replace() while already on the archive avoids one history entry per keystroke.
      if (pathnameRef.current !== '/archive') {
        router.push(buildArchiveUrl(query));
      } else {
        window.history.replaceState(window.history.state, '', buildArchiveUrl(query));
      }
    } catch (error) {
      if (error?.name !== 'AbortError' && process.env.NODE_ENV === 'development') {
        console.error('Header search failed:', error);
      }
    } finally {
      if (abortRef.current === controller) {
        setIsSearching(false);
      }
    }
  }, [router, setSearchPayload]);

  // On first load: replay the ?search= query so the URL is a way back in, or,
  // without a param, adopt the session-restored filter so the field reflects
  // (and can lift) a search that is still active.
  useEffect(() => {
    const initialQuery = new URLSearchParams(window.location.search).get(SEARCH_PARAM)?.trim();
    if (initialQuery && window.location.pathname === '/archive') {
      setValue(initialQuery);
      runSearch(initialQuery);
      return;
    }

    // Entry pages keep the filtered list for the pager (restored by the
    // provider), so the field mirrors the persisted query there. On /archive
    // itself the URL is the single source of truth: no ?search=, no search --
    // the provider purges any stale stored filter on its side.
    if (window.location.pathname.startsWith('/archive/entry/')) {
      const persisted = readFromSessionStorage(SESSION_STORAGE_KEYS.SEARCH_STATUS, null);
      if (persisted?.query) {
        setValue(persisted.query);
        lastQueryRef.current = persisted.query;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the archive's own Clear button wipes the filters, reset the field and the URL.
  useEffect(() => {
    const handleFiltersChange = (event) => {
      if (event?.detail?.hasActiveFilters === false && lastQueryRef.current) {
        lastQueryRef.current = null;
        setValue('');
        if (window.location.pathname === '/archive' && window.location.search) {
          window.history.replaceState(window.history.state, '', '/archive');
        }
      }
    };

    window.addEventListener(ARCHIVE_FILTERS_CHANGE_EVENT, handleFiltersChange);
    return () => window.removeEventListener(ARCHIVE_FILTERS_CHANGE_EVENT, handleFiltersChange);
  }, []);

  useEffect(() => () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);

  const scheduleSearch = (nextValue) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const query = nextValue.trim();

    debounceRef.current = setTimeout(() => {
      if (query.length >= MIN_QUERY_LENGTH && query !== lastQueryRef.current) {
        runSearch(query);
      } else if (query.length === 0 && lastQueryRef.current) {
        // Field emptied after a search: lift the keyword filter and drop the URL param.
        lastQueryRef.current = null;
        setSearchPayload(CLEARED_SEARCH_PAYLOAD);
        if (window.location.pathname === '/archive' && window.location.search) {
          window.history.replaceState(window.history.state, '', '/archive');
        }
      }
    }, DEBOUNCE_MS);
  };

  const handleChange = (event) => {
    setValue(event.target.value);
    scheduleSearch(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const query = value.trim();
    if (query.length > 0) {
      runSearch(query);
    }
  };

  return (
    <form className={styles.headerSearch} onSubmit={handleSubmit} role="search">
      <input
        id="header-search-input"
        className={styles.headerSearchInput}
        type="search"
        value={value}
        onChange={handleChange}
        placeholder="Search"
        aria-label="Search the archive"
        data-searching={isSearching}
        autoComplete="off"
      />
    </form>
  );
}
