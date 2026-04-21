'use client';

import { createContext, useContext, useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useArchiveSearchState } from './ArchiveSearchStateProvider';
import {
  ARCHIVE_FILTERS_CHANGE_EVENT,
  isValidArchiveView,
  setArchiveViewPreference,
  dispatchArchiveFiltersChangeEvent,
  writeToSessionStorage,
} from './state/archiveStorage';
import {
  getInitialArchiveSorting,
  getFilteredArchiveEntries,
  getSortedArchiveEntries,
} from './state/archiveEntryFilters';
import {
  useArchiveViewSync,
  useRestoreArchiveState,
  useSyncArchiveFilterRefs,
  useArchiveFilterActions,
} from './state/archiveEntriesProviderHooks';

const ArchiveEntriesContext = createContext(null);

export default function ArchiveEntriesProvider({ initialEntries = [], initialView = null, children }) {
  /**
   * All stateful logic for the archive lives inside this provider. It keeps track
   * of the active view, orchestrates search queries, and exposes helpers to any
   * descendant component through context.
   */
  // Ensure initialEntries is an array
  const safeInitialEntries = Array.isArray(initialEntries) ? initialEntries : [];
  const [entries] = useState(() => {
    return safeInitialEntries;
  });
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

  /**
   * Derive the list of visible entries. When there is no active search we return all
   * entries. Once a search is running we filter by the set of matching IDs and keep
   * the order consistent with the ranking provided by the vector store.
   * Also filters by selected mood tag if one is active.
   */
  const filtered = useMemo(
    () => getFilteredArchiveEntries(entries, searchResults, selectedMoodTags),
    [entries, searchResults, selectedMoodTags]
  );

  const sortedEntries = useMemo(
    () => getSortedArchiveEntries(filtered, sorting),
    [filtered, sorting]
  );

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
      visibleEntries: sortedEntries,
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
    }),
    [clearAllFilters, clearSearch, clearMoodTag, entries, setSearchFromPayload, searchStatus, selectedMoodTags, setMoodTag, setMoodTags, setSortingWithStorage, setView, sortedEntries, sorting, view]
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

