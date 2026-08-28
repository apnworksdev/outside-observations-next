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

const CLEARED_SEARCH_PAYLOAD = {
  resultsState: { active: false, ids: [], orderedIds: [] },
  statusState: { status: 'idle', query: null, summary: null, error: null },
};

export default function HeaderSearch() {
  const [value, setValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { setSearchPayload } = useArchiveSearchState();
  const pathname = usePathname();
  const router = useRouter();

  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  const lastQueryRef = useRef(null);
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

  useEffect(() => {
    const initialQuery = new URLSearchParams(window.location.search).get(SEARCH_PARAM)?.trim();
    if (initialQuery && window.location.pathname === '/archive') {
      setValue(initialQuery);
      runSearch(initialQuery);
      return;
    }

    if (window.location.pathname.startsWith('/archive/entry/')) {
      const persisted = readFromSessionStorage(SESSION_STORAGE_KEYS.SEARCH_STATUS, null);
      if (persisted?.query) {
        setValue(persisted.query);
        lastQueryRef.current = persisted.query;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
