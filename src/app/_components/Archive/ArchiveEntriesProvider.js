'use client';

import { createContext, useContext, useMemo, useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useArchiveSearchState } from './ArchiveSearchStateProvider';

const ArchiveEntriesContext = createContext(null);

const DUPLICATION_FACTOR = 10;
const SIMILARITY_THRESHOLD = 0.1;
export const VIEW_COOKIE_NAME = 'outside-observations-archive-view';
export const VIEW_CHANGE_EVENT = 'outside-observations:archive-view-change';
const VIEW_COOKIE_MAX_AGE_SECONDS = 60 * 60; // 1 hour

function isValidView(value) {
  return value === 'images' || value === 'list';
}

function readViewCookie() {
  if (typeof document === 'undefined') {
    return 'images';
  }

  const cookieString = document.cookie || '';
  const cookieEntry = cookieString
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${VIEW_COOKIE_NAME}=`));

  if (!cookieEntry) {
    return 'images';
  }

  const [, value = ''] = cookieEntry.split('=');
  const decoded = decodeURIComponent(value);
  return isValidView(decoded) ? decoded : 'images';
}

function writeViewCookie(view) {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${VIEW_COOKIE_NAME}=${encodeURIComponent(view)}; Max-Age=${VIEW_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
}

export function setArchiveViewPreference(view) {
  if (!isValidView(view)) {
    return;
  }

  writeViewCookie(view);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(VIEW_CHANGE_EVENT, { detail: { view } }));
  }
}

function multiplyEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  /**
   * The archive currently lacks enough real records to fill the designed layout.
   * To preserve the intended browsing experience we clone every entry several times.
   * Each clone keeps a pointer to the original `_id` (via `baseId`) so that features
   * like search can treat the duplicates as a single logical item.
   */
  const multiplied = [];

  for (let i = 0; i < DUPLICATION_FACTOR; i += 1) {
    for (let j = 0; j < entries.length; j += 1) {
      const entry = entries[j];
      const isFirstClone = i === 0;

      multiplied.push({
        ...entry,
        _id: isFirstClone ? entry._id : `${entry._id}__mock-${i}`,
        baseId: entry._id,
      });
    }
  }

  return multiplied;
}

function normaliseYearValue(entry) {
  const { year } = entry ?? {};

  if (typeof year === 'number' && Number.isFinite(year)) {
    return year;
  }

  if (typeof year === 'string') {
    const parsed = parseInt(year, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return null;
}

function normaliseStringValue(entry, key) {
  const value = entry?.[key];

  if (typeof value === 'string') {
    return value.trim().toLocaleLowerCase();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toString();
  }

  return value ?? '';
}

const SORT_ACCESSORS = {
  year: normaliseYearValue,
  artName: (entry) => normaliseStringValue(entry, 'artName'),
  fileName: (entry) => normaliseStringValue(entry, 'fileName'),
  source: (entry) => normaliseStringValue(entry, 'source'),
  type: (entry) => normaliseStringValue(entry, 'type'),
};

function getInitialSorting() {
  return { column: null, direction: null };
}

function compareSortValues(valueA, valueB, isAscending) {
  const bothNumbers =
    typeof valueA === 'number' &&
    typeof valueB === 'number' &&
    Number.isFinite(valueA) &&
    Number.isFinite(valueB);

  if (bothNumbers) {
    return isAscending ? valueA - valueB : valueB - valueA;
  }

  const stringA = typeof valueA === 'string' ? valueA : valueA === null || valueA === undefined ? '' : String(valueA);
  const stringB = typeof valueB === 'string' ? valueB : valueB === null || valueB === undefined ? '' : String(valueB);

  const comparison = stringA.localeCompare(stringB, undefined, { sensitivity: 'base', numeric: true });

  if (comparison === 0) {
    return 0;
  }

  return isAscending ? comparison : -comparison;
}

export default function ArchiveEntriesProvider({ initialEntries = [], initialView = null, children }) {
  /**
   * All stateful logic for the archive lives inside this provider. It inflates the
   * dataset (see `multiplyEntries`), keeps track of the active view, orchestrates
   * search queries, and exposes helpers to any descendant component through context.
   * We duplicate the entries once and memoise the result so every consumer reads from
   * the same in-memory collection.
   */
  // Ensure initialEntries is an array
  const safeInitialEntries = Array.isArray(initialEntries) ? initialEntries : [];
  const [entries] = useState(() => {
    try {
      return multiplyEntries(safeInitialEntries);
    } catch (error) {
      console.error('Failed to multiply entries:', error);
      return [];
    }
  });
  // Initialize view: Always start with 'images' to match server render and prevent hydration mismatch
  // The view will be updated from cookie/data attribute in useEffect after mount
  const [view, setViewState] = useState(() => {
    // Only use initialView prop if provided (for server-side passing)
    // Otherwise always default to 'images' to ensure server/client match
    return isValidView(initialView) ? initialView : 'images';
  });
  const [searchResults, setSearchResultsState] = useState({ active: false, ids: [], orderedIds: [] });
  const [searchStatus, setSearchStatus] = useState({ status: 'idle', query: null, summary: null, error: null });
  const [sorting, setSorting] = useState(() => getInitialSorting());
  const [selectedMoodTag, setSelectedMoodTag] = useState(null);
  const requestIdRef = useRef(0);
  const pendingSearchPayloadRef = useRef(null);
  const previousPathRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  
  // Get search state from global provider (set by ChatBox or other components)
  const { consumeSearchPayload, setSearchPayload: setGlobalSearchPayload, searchPayload: globalSearchPayload } = useArchiveSearchState();

  /**
   * `setView` persists the preference and keeps the header toggle in sync by delegating
   * to `setArchiveViewPreference`, which writes the cookie and dispatches a global event.
   * Guard clauses ensure that repeated requests for the current view become no-ops.
   */
  const setView = useCallback((nextView) => {
    setViewState((prev) => {
      if (!isValidView(nextView) || prev === nextView) {
        return prev;
      }

      setArchiveViewPreference(nextView);
      return nextView;
    });
  }, []);

  /**
   * On mount we synchronise the initial view with any cookie that might have been set
   * on a previous visit. We use useLayoutEffect to update synchronously before paint,
   * preventing any visual flash when the correct view is restored from cookie.
   * We also subscribe to the global `VIEW_CHANGE_EVENT` so that other surfaces
   * (like the header toggle rendered outside this provider) can change the current view
   * and keep the archive in lockstep.
   */
  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    setViewState((prev) => {
      const cookieView = readViewCookie();
      if (isValidView(cookieView) && cookieView !== prev) {
        return cookieView;
      }
      return prev;
    });

    const handleExternalViewChange = (event) => {
      const nextView = event?.detail?.view;
      if (!isValidView(nextView)) {
        return;
      }

      setViewState((prev) => {
        if (prev === nextView) {
          return prev;
        }

        writeViewCookie(nextView);
        return nextView;
      });
    };

    window.addEventListener(VIEW_CHANGE_EVENT, handleExternalViewChange);
    return () => {
      window.removeEventListener(VIEW_CHANGE_EVENT, handleExternalViewChange);
    };
  }, []);

  /**
   * Derive the list of visible entries. When there is no active search we return every
   * duplicated entry so the layout stays dense. Once a search is running we filter by
   * the set of matching IDs (supporting both the clone `_id` and the `baseId`) and keep
   * the order consistent with the ranking provided by the vector store.
   * Also filters by selected mood tag if one is active.
   */
  const filtered = useMemo(() => {
    let result = entries;

    // Apply search filtering if active
    if (searchResults?.active) {
      const allowedIds = new Set(searchResults.ids);

      if (allowedIds.size === 0) {
        return [];
      }

      const rankList = searchResults.orderedIds ?? [];
      const rankMap = new Map();

      for (let index = 0; index < rankList.length; index += 1) {
        const id = rankList[index];
        if (!rankMap.has(id)) {
          rankMap.set(id, index);
        }
      }

      const getRankForEntry = (entry) => {
        if (!entry) {
          return Number.POSITIVE_INFINITY;
        }

        if (rankMap.has(entry._id)) {
          return rankMap.get(entry._id);
        }

        if (entry.baseId && rankMap.has(entry.baseId)) {
          return rankMap.get(entry.baseId);
        }

        return Number.POSITIVE_INFINITY;
      };

      result = entries
        .filter((entry) => allowedIds.has(entry._id) || (entry.baseId && allowedIds.has(entry.baseId)))
        .sort((a, b) => getRankForEntry(a) - getRankForEntry(b));
    }

    // Apply mood tag filtering if a tag is selected
    if (selectedMoodTag) {
      result = result.filter((entry) => {
        const moodTags = entry.aiMoodTags || [];
        return moodTags.some((tag) => tag?.name === selectedMoodTag);
      });
    }

    return result;
  }, [entries, searchResults, selectedMoodTag]);

  const sortedEntries = useMemo(() => {
    const column = sorting?.column;
    const direction = sorting?.direction;

    if (!column || !direction) {
      return filtered;
    }

    const accessor = SORT_ACCESSORS[column];

    if (typeof accessor !== 'function') {
      return filtered;
    }

    const isAscending = direction === 'asc';
    const withMeta = filtered.map((entry, index) => ({
      entry,
      index,
      value: accessor(entry),
    }));

    withMeta.sort((a, b) => {
      const valueA = a.value;
      const valueB = b.value;

      if (valueA === valueB) {
        return a.index - b.index;
      }

      if (valueA === null || valueA === undefined) {
        return isAscending ? 1 : -1;
      }

      if (valueB === null || valueB === undefined) {
        return isAscending ? -1 : 1;
      }

      const comparison = compareSortValues(valueA, valueB, isAscending);

      if (comparison === 0) {
        return a.index - b.index;
      }

      return comparison;
    });

    return withMeta.map((item) => item.entry);
  }, [filtered, sorting]);

  const applySearchPayload = useCallback((payload) => {
    if (!payload) {
      return;
    }

    // Clear mood tag filter when applying search results
    setSelectedMoodTag(null);
    setSearchResultsState(payload.resultsState);
    setSearchStatus(payload.statusState);
    setSorting(getInitialSorting());
  }, []);

  // Method to set search from existing payload (e.g., from chat with already-fetched image IDs)
  // Uses global search state provider for consistency
  const setSearchFromPayload = useCallback((payload) => {
    if (!payload) {
      return;
    }

    if (pathname !== '/archive') {
      // Use global provider and navigate (consistent with ChatBox approach)
      setGlobalSearchPayload(payload);
      router.push('/archive');
    } else {
      // Apply directly if already on archive page
      applySearchPayload(payload);
    }
  }, [applySearchPayload, pathname, router, setGlobalSearchPayload]);

  // Check for search payload from global search state provider (e.g., from ChatBox)
  // This allows the ChatBox to set search state from any page, and we consume it here
  useEffect(() => {
    if (pathname !== '/archive') {
      return;
    }

    // Check for pending search from ref (e.g., from navigation within archive or from chat)
    if (pendingSearchPayloadRef.current) {
      applySearchPayload(pendingSearchPayloadRef.current);
      pendingSearchPayloadRef.current = null;
    }

    // Check for search payload from global provider
    // Listen to globalSearchPayload changes and consume when available
    if (globalSearchPayload) {
      const payload = consumeSearchPayload();
      if (payload) {
        applySearchPayload(payload);
      }
    }
  }, [pathname, applySearchPayload, consumeSearchPayload, globalSearchPayload]);

  /**
   * `runSearch` wraps the full request lifecycle:
   *   1. Bail out (and reset state) on empty queries.
   *   2. Track an incrementing request id so we can ignore late responses.
   *   3. Submit the vector-store query with the configured similarity threshold.
   *   4. Normalise the result into an ordered list of unique entry IDs that the UI
   *      can consume for both filtering and result summaries.
   *   5. Handle navigation transitions when the user triggers the search from a page
   *      outside `/archive` by remembering the payload and pushing the new route.
   * Network errors degrade gracefully to the idle state without surfacing details to users.
   */
  const runSearch = useCallback(
    async (query) => {
      const trimmedQuery = (query ?? '').trim();

      if (!trimmedQuery) {
        requestIdRef.current += 1;
        setSearchResultsState({ active: false, ids: [], orderedIds: [] });
        setSearchStatus({ status: 'idle', query: null, summary: null, error: null });
        setSorting(getInitialSorting());
        pendingSearchPayloadRef.current = null;
        return;
      }

      // Clear mood tag filter when starting a search
      setSelectedMoodTag(null);

      const currentRequestId = requestIdRef.current + 1;
      requestIdRef.current = currentRequestId;
      pendingSearchPayloadRef.current = null;

      setSearchStatus({ status: 'loading', query: trimmedQuery, summary: null, error: null });

      try {
        const response = await fetch('/api/vector-store/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: trimmedQuery,
            minSimilarity: SIMILARITY_THRESHOLD,
          }),
        });

        if (!response.ok) {
          let errorMessage = 'Search failed';
          try {
            const errorBody = await response.json();
            errorMessage = errorBody?.error || errorBody?.message || `Search failed: ${response.status}`;
          } catch (parseError) {
            // If JSON parsing fails, use status text
            errorMessage = `Search failed: ${response.status} ${response.statusText || 'Unknown error'}`;
          }
          throw new Error(errorMessage);
        }

        let result;
        try {
          result = await response.json();
        } catch (parseError) {
          console.error('Failed to parse search response:', parseError);
          throw new Error('Invalid response from search service');
        }

        if (requestIdRef.current !== currentRequestId) {
          return;
        }

        // The new API returns images as an array of image ID strings
        const imageIds = Array.isArray(result?.images)
          ? result.images.filter((id) => typeof id === 'string' && id.trim().length > 0)
          : [];

        const orderedUniqueIds = [];
        const seenIds = new Set();

        for (let index = 0; index < imageIds.length; index += 1) {
          const id = imageIds[index];
          if (!seenIds.has(id)) {
            seenIds.add(id);
            orderedUniqueIds.push(id);
          }
        }

        const payload = {
          resultsState:
            orderedUniqueIds.length > 0
              ? { active: true, ids: orderedUniqueIds, orderedIds: orderedUniqueIds }
              : { active: true, ids: [], orderedIds: [] },
          statusState: {
            status: 'success',
            query: trimmedQuery,
            summary: {
              original: result?.original_query ?? trimmedQuery,
              rewritten: result?.rewritten_query ?? trimmedQuery,
              matches: orderedUniqueIds.length,
              threshold: SIMILARITY_THRESHOLD,
            },
            error: null,
          },
        };

        if (pathname !== '/archive') {
          pendingSearchPayloadRef.current = payload;
          router.push('/archive');
        } else {
          applySearchPayload(payload);
        }
      } catch (error) {
        if (requestIdRef.current !== currentRequestId) {
          return;
        }

        // Determine user-friendly error message
        let errorMessage = 'Search failed. Please try again.';
        if (error instanceof TypeError && error.message.includes('fetch')) {
          errorMessage = 'Unable to connect to search service. Please check your internet connection.';
        } else if (error.message) {
          const message = error.message.toLowerCase();
          if (message.includes('network') || message.includes('fetch')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else if (message.includes('timeout')) {
            errorMessage = 'Search request timed out. Please try again.';
          } else if (message.length < 150) {
            // Use error message if it's reasonably short
            errorMessage = error.message;
          }
        }

        console.error('Search error:', error);

        const payload = {
          resultsState: { active: true, ids: [], orderedIds: [] },
          statusState: {
            status: 'error',
            query: trimmedQuery,
            summary: null,
            error: errorMessage,
          },
        };

        if (pathname !== '/archive') {
          pendingSearchPayloadRef.current = payload;
          router.push('/archive');
        } else {
          applySearchPayload(payload);
        }
      }
    },
    [applySearchPayload, pathname, router]
  );

  const clearSearch = useCallback(() => {
    requestIdRef.current += 1;
    setSearchResultsState({ active: false, ids: [], orderedIds: [] });
    setSearchStatus({ status: 'idle', query: null, summary: null, error: null });
    setSorting(getInitialSorting());
    pendingSearchPayloadRef.current = null;
  }, []);

  const setMoodTag = useCallback(
    (tagName) => {
      // Navigate to archive page if not already there
      if (pathname !== '/archive') {
        router.push('/archive');
      }
      setSelectedMoodTag(tagName);
      // Clear search when filtering by mood tag
      clearSearch();
    },
    [clearSearch, pathname, router]
  );

  const clearMoodTag = useCallback(() => {
    setSelectedMoodTag(null);
  }, []);

  /**
   * When the user leaves the archive we reset any active search so that a future visit
   * starts from the default images view. We keep track of the last pathname visited to
   * detect the transition reliably on client navigation.
   */
  useEffect(() => {
    if (!pathname) {
      previousPathRef.current = pathname;
      return;
    }

    if (previousPathRef.current === '/archive' && pathname !== '/archive') {
      clearSearch();
      clearMoodTag();
    }

    previousPathRef.current = pathname;
  }, [clearSearch, clearMoodTag, pathname]);

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
      runSearch,
      setSearchFromPayload,
      clearSearch,
      sorting,
      setSorting,
      selectedMoodTag,
      setMoodTag,
      clearMoodTag,
    }),
    [clearSearch, clearMoodTag, entries, runSearch, setSearchFromPayload, searchStatus, selectedMoodTag, setMoodTag, setSorting, setView, sortedEntries, sorting, view]
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

      if (nextDirection === null) {
        return getInitialSorting();
      }

      return { column, direction: nextDirection };
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

