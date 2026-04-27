'use client';

import { createContext, useContext, useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useArchiveSearchState } from './ArchiveSearchStateProvider';
import {
  ARCHIVE_FILTERS_CHANGE_EVENT,
  SESSION_STORAGE_KEYS,
  isValidArchiveView,
  setArchiveViewPreference,
  dispatchArchiveFiltersChangeEvent,
  writeToSessionStorage,
} from '../state/archiveStorage';
import {
  getInitialArchiveSorting,
} from '../state/archiveEntryFilters';
import {
  useArchiveViewSync,
  useRestoreArchiveState,
  useSyncArchiveFilterRefs,
  useArchiveFilterActions,
} from '../state/archiveEntriesProviderHooks';

const ArchiveEntriesContext = createContext(null);
const ROWS_PER_PAGE = 10;
const PAGE_SIZE_RESIZE_DEBOUNCE_MS = 180;

function getPageSizeForViewportWidth(width) {
  if (width < 768) {
    return 2 * ROWS_PER_PAGE;
  }
  if (width < 1024) {
    return 3 * ROWS_PER_PAGE;
  }
  if (width < 1280) {
    return 4 * ROWS_PER_PAGE;
  }
  return 6 * ROWS_PER_PAGE;
}

function getPageSizeBucket(width) {
  if (width < 768) return 'xs';
  if (width < 1024) return 'sm';
  if (width < 1280) return 'md';
  return 'lg';
}

export default function ArchiveEntriesProvider({ initialEntries = [], initialView = null, children }) {
  /**
   * All stateful logic for the archive lives inside this provider. It keeps track
   * of the active view, orchestrates search queries, and exposes helpers to any
   * descendant component through context.
   */
  // Ensure initialEntries is an array
  const safeInitialEntries = Array.isArray(initialEntries) ? initialEntries : [];
  const [entries, setEntries] = useState(() => safeInitialEntries);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [paginationError, setPaginationError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pageSize, setPageSize] = useState(40);
  // Initialize view: Always start with 'images' to match server render and prevent hydration mismatch
  // The view will be updated from localStorage in useLayoutEffect after mount
  const [view, setViewState] = useState(() => {
    // Only use initialView prop if provided (for server-side passing)
    // Otherwise always default to 'images' to ensure server/client match
    return isValidArchiveView(initialView) ? initialView : 'images';
  });
  // Initialize state with default values (same on server and client to prevent hydration mismatch)
  const [searchResults, setSearchResultsState] = useState({ active: false, ids: [], orderedIds: [] });
  const [searchStatus, setSearchStatus] = useState({ status: 'idle', query: null, summary: null, error: null });
  const [sorting, setSorting] = useState(() => getInitialArchiveSorting());
  const [selectedMoodTags, setSelectedMoodTags] = useState([]);
  const pendingSearchPayloadRef = useRef(null);
  const previousPathRef = useRef(null);
  const selectedMoodTagsRef = useRef([]);
  const searchQueryRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const requestIdRef = useRef(0);
  const fetchAbortRef = useRef(null);
  const pageSizeBucketRef = useRef(null);
  const hasLoadedArchivePageRef = useRef(false);
  const lastArchiveQuerySignatureRef = useRef(null);
  
  // Get search state from global provider (set by ChatBox or other components)
  const { consumeSearchPayload, setSearchPayload: setGlobalSearchPayload, searchPayload: globalSearchPayload } = useArchiveSearchState();

  // Wrap setSorting to automatically save to session storage
  const setSortingWithStorage = useCallback((nextSorting) => {
    setSorting((prev) => {
      const next = typeof nextSorting === 'function' ? nextSorting(prev) : nextSorting;
      writeToSessionStorage(SESSION_STORAGE_KEYS.SORTING, next);
      return next;
    });
  }, []);

  /**
   * `setView` persists the preference and keeps the header toggle in sync by delegating
   * to `setArchiveViewPreference`, which writes to localStorage and dispatches a global event.
   * Guard clauses ensure that repeated requests for the current view become no-ops.
   */
  const setView = useCallback((nextView) => {
    setViewState((prev) => {
      if (!isValidArchiveView(nextView) || prev === nextView) {
        return prev;
      }

      setArchiveViewPreference(nextView);
      return nextView;
    });
  }, []);

  useArchiveViewSync({ setViewState });

  useRestoreArchiveState({
    pathname,
    setSearchResultsState,
    setSearchStatus,
    setSorting,
    setSelectedMoodTags,
    searchQueryRef,
    selectedMoodTagsRef,
  });

  useSyncArchiveFilterRefs({ searchStatus, selectedMoodTags, searchQueryRef, selectedMoodTagsRef });

  const visibleEntries = entries;

  const {
    setSearchFromPayload,
    clearSearch,
    setMoodTag,
    setMoodTags,
    clearMoodTag,
    clearAllFilters,
  } = useArchiveFilterActions({
    pathname,
    router,
    setGlobalSearchPayload,
    consumeSearchPayload,
    globalSearchPayload,
    pendingSearchPayloadRef,
    requestIdRef,
    selectedMoodTagsRef,
    searchQueryRef,
    setSearchResultsState,
    setSearchStatus,
    setSelectedMoodTags,
    setSortingWithStorage,
  });

  const loadArchivePage = useCallback(async ({ cursor = null, append = false, showRefreshing = false } = {}) => {
    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort();
    }

    const controller = new AbortController();
    fetchAbortRef.current = controller;

    const searchIds = searchResults?.active ? searchResults?.ids ?? [] : [];
    const sortColumn = sorting?.column ?? null;
    const sortDirection = sorting?.direction ?? null;

    if (!append) {
      setIsInitialLoading(true);
      setPaginationError(null);
      if (showRefreshing) {
        setIsRefreshing(true);
      }
    } else {
      setIsLoadingMore(true);
      setPaginationError(null);
    }

    try {
      const response = await fetch('/api/archive-entries/paginated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          cursor,
          limit: pageSize,
          sortColumn,
          sortDirection,
          moodTags: selectedMoodTags,
          searchIds,
        }),
      });

      if (!response.ok) {
        throw new Error(`Pagination request failed with status ${response.status}`);
      }

      const payload = await response.json();
      const incomingItems = Array.isArray(payload?.items) ? payload.items : [];
      const normalisedItems = incomingItems.filter(
        (item) => item && typeof item._id === 'string' && item._id.trim().length > 0
      );
      const incomingCursor = payload?.nextCursor ?? null;
      const incomingHasMore = payload?.hasMore === true;
      const safeHasMore = incomingHasMore && normalisedItems.length > 0;

      if (append && incomingHasMore && normalisedItems.length === 0) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[archive/pagination] Append returned empty items while hasMore=true. Stopping pagination.');
        }
        setHasMore(false);
        setNextCursor(null);
        setPaginationError('Pagination returned no new entries. Please refresh and try again.');
        return;
      }

      setEntries((previous) => {
        if (!append) {
          return normalisedItems;
        }

        const seen = new Set(previous.map((item) => item?._id).filter(Boolean));
        const dedupedIncoming = normalisedItems.filter((item) => {
          const id = item?._id;
          if (!id || seen.has(id)) {
            return false;
          }
          seen.add(id);
          return true;
        });
        return [...previous, ...dedupedIncoming];
      });
      setNextCursor(safeHasMore ? incomingCursor : null);
      setHasMore(safeHasMore);
      setPaginationError(null);
      if (!append) {
        hasLoadedArchivePageRef.current = true;
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        setPaginationError(error?.message || 'Failed to load archive entries.');
      }
    } finally {
      if (fetchAbortRef.current === controller) {
        fetchAbortRef.current = null;
      }
      setIsInitialLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, [pageSize, searchResults, selectedMoodTags, sorting]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || isInitialLoading || !nextCursor) {
      return;
    }
    loadArchivePage({ cursor: nextCursor, append: true });
  }, [hasMore, isLoadingMore, isInitialLoading, loadArchivePage, nextCursor]);

  const retryLoadMore = useCallback(() => {
    if (isLoadingMore || isInitialLoading) {
      return;
    }

    if (nextCursor) {
      loadArchivePage({ cursor: nextCursor, append: true });
      return;
    }

    loadArchivePage({ cursor: null, append: false });
  }, [isInitialLoading, isLoadingMore, loadArchivePage, nextCursor]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let debounceTimer = null;
    const applyPageSize = () => {
      const width = window.innerWidth;
      const nextBucket = getPageSizeBucket(width);
      if (pageSizeBucketRef.current === nextBucket) {
        return;
      }
      pageSizeBucketRef.current = nextBucket;
      setPageSize(getPageSizeForViewportWidth(width));
    };

    const onResize = () => {
      if (debounceTimer) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        applyPageSize();
      }, PAGE_SIZE_RESIZE_DEBOUNCE_MS);
    };

    applyPageSize();
    window.addEventListener('resize', onResize);

    return () => {
      if (debounceTimer) {
        window.clearTimeout(debounceTimer);
      }
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const querySignature = useMemo(() => {
    const sortKey = `${sorting?.column ?? 'none'}:${sorting?.direction ?? 'none'}`;
    const moodKey = selectedMoodTags.join('|');
    const searchKey = searchResults?.active ? (searchResults?.ids ?? []).join('|') : 'none';
    return `${sortKey}::${moodKey}::${searchKey}::${pageSize}`;
  }, [pageSize, searchResults, selectedMoodTags, sorting]);

  useEffect(() => {
    if (pathname !== '/archive') {
      return;
    }

    const queryChanged = lastArchiveQuerySignatureRef.current !== querySignature;
    const needsInitialLoad = !hasLoadedArchivePageRef.current;
    lastArchiveQuerySignatureRef.current = querySignature;

    if (!needsInitialLoad && !queryChanged) {
      return;
    }

    setNextCursor(null);
    setHasMore(true);
    loadArchivePage({ cursor: null, append: false, showRefreshing: true });
  }, [pathname, querySignature, loadArchivePage]);

  useEffect(() => {
    return () => {
      if (fetchAbortRef.current) {
        fetchAbortRef.current.abort();
      }
    };
  }, []);

  /**
   * Dispatch filter change events whenever filter state changes
   * This is a fallback for any edge cases where immediate dispatch might be missed
   * Primary dispatch happens immediately in callbacks for better performance
   */
  useEffect(() => {
    if (typeof window === 'undefined' || pathname !== '/archive') {
      return;
    }

    const hasActiveFilters = 
      searchStatus?.query !== null || 
      selectedMoodTags?.length > 0;
    
    dispatchArchiveFiltersChangeEvent(hasActiveFilters);
  }, [pathname, searchStatus?.query, selectedMoodTags?.length]);

  /**
   * When the user leaves the archive we keep the state in session storage
   * so it can be restored when they return. We keep track of the last pathname visited
   * to detect the transition reliably on client navigation.
   */
  useEffect(() => {
    if (!pathname) {
      previousPathRef.current = pathname;
      return;
    }

    // State is already saved to session storage when it changes, so we don't need to clear it
    // when leaving the archive - it will be restored when they return
    previousPathRef.current = pathname;
  }, [pathname]);

  /**
   * All pieces of state and helper actions are memoised into a stable object, ensuring
   * consumers only re-render when something meaningful changes (entries, filters, view,
   * or search state). This keeps the archive UI responsive even with the artificial
   * data multiplication in place.
   */
  const value = useMemo(
    () => ({
      entries,
      visibleEntries,
      view,
      setView,
      searchStatus,
      setSearchFromPayload,
      clearSearch,
      sorting,
      setSorting: setSortingWithStorage,
      selectedMoodTags,
      setMoodTag,
      setMoodTags,
      clearMoodTag,
      clearAllFilters,
      hasMore,
      isInitialLoading,
      isLoadingMore,
      paginationError,
      loadMore,
      retryLoadMore,
      isRefreshing,
    }),
    [clearAllFilters, clearSearch, clearMoodTag, entries, hasMore, isInitialLoading, isLoadingMore, isRefreshing, loadMore, paginationError, retryLoadMore, setSearchFromPayload, searchStatus, selectedMoodTags, setMoodTag, setMoodTags, setSortingWithStorage, setView, sorting, view, visibleEntries]
  );

  return <ArchiveEntriesContext.Provider value={value}>{children}</ArchiveEntriesContext.Provider>;
}

export function useArchiveEntries() {
  const context = useContext(ArchiveEntriesContext);
  if (!context) {
    throw new Error('useArchiveEntries must be used within an ArchiveEntriesProvider');
  }

  return context;
}

export function useArchiveEntriesSafe() {
  return useContext(ArchiveEntriesContext);
}

const SORT_DIRECTION_ORDER = ['desc', 'asc', null];

function getNextSortDirection(previousDirection) {
  const currentIndex = SORT_DIRECTION_ORDER.indexOf(previousDirection ?? null);
  const nextIndex = (currentIndex + 1) % SORT_DIRECTION_ORDER.length;
  return SORT_DIRECTION_ORDER[nextIndex];
}

function getSortAriaLabel(label, direction, customMessages) {
  const defaults = {
    desc: `${label} column, sorted descending. Activate to sort ascending.`,
    asc: `${label} column, sorted ascending. Activate to clear sorting.`,
    inactive: `${label} column, no sorting applied. Activate to sort descending.`,
  };

  const messages = { ...defaults, ...(customMessages ?? {}) };

  if (direction === 'desc') {
    return messages.desc;
  }

  if (direction === 'asc') {
    return messages.asc;
  }

  return messages.inactive;
}

function getSortIndicator(direction) {
  if (direction === 'asc') {
    return '↑';
  }

  if (direction === 'desc') {
    return '↓';
  }

  return '↕';
}

export function useArchiveSortController(column, { label: customLabel, ariaMessages } = {}) {
  const { sorting, setSorting } = useArchiveEntries();

  const direction = sorting?.column === column ? sorting?.direction ?? null : null;
  const label = customLabel ?? column;

  const toggleSort = useCallback(() => {
    setSorting((previous) => {
      const prevColumn = previous?.column === column ? column : null;
      const prevDirection = prevColumn ? previous?.direction ?? null : null;
      const nextDirection = getNextSortDirection(prevDirection);

      return nextDirection === null
        ? getInitialArchiveSorting()
        : { column, direction: nextDirection };
    });
  }, [column, setSorting]);

  const ariaLabel = useMemo(
    () => getSortAriaLabel(label, direction, ariaMessages),
    [ariaMessages, direction, label]
  );
  const indicator = useMemo(() => getSortIndicator(direction), [direction]);
  const dataState = direction ?? 'inactive';

  return {
    column,
    direction,
    toggleSort,
    ariaLabel,
    indicator,
    dataState,
  };
}

