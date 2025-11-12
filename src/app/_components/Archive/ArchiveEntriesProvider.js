'use client';

import { createContext, useContext, useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

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
    return 'list';
  }

  const cookieString = document.cookie || '';
  const cookieEntry = cookieString
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${VIEW_COOKIE_NAME}=`));

  if (!cookieEntry) {
    return 'list';
  }

  const [, value = ''] = cookieEntry.split('=');
  const decoded = decodeURIComponent(value);
  return isValidView(decoded) ? decoded : 'list';
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

export default function ArchiveEntriesProvider({ initialEntries = [], initialView = null, children }) {
  /**
   * All stateful logic for the archive lives inside this provider. It inflates the
   * dataset (see `multiplyEntries`), keeps track of the active view, orchestrates
   * search queries, and exposes helpers to any descendant component through context.
   * We duplicate the entries once and memoise the result so every consumer reads from
   * the same in-memory collection.
   */
  const [entries] = useState(() => multiplyEntries(initialEntries));
  const [view, setViewState] = useState(() => (isValidView(initialView) ? initialView : 'list'));
  const [searchResults, setSearchResultsState] = useState({ active: false, ids: [], orderedIds: [] });
  const [searchStatus, setSearchStatus] = useState({ status: 'idle', query: null, summary: null, error: null });
  const requestIdRef = useRef(0);
  const pendingSearchPayloadRef = useRef(null);
  const previousPathRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();

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
   * on a previous visit. We also subscribe to the global `VIEW_CHANGE_EVENT` so that
   * other surfaces (like the header toggle rendered outside this provider) can change
   * the current view and keep the archive in lockstep.
   */
  useEffect(() => {
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
   */
  const filtered = useMemo(() => {
    if (!searchResults?.active) {
      return entries;
    }

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

    return entries
      .filter((entry) => allowedIds.has(entry._id) || (entry.baseId && allowedIds.has(entry.baseId)))
      .sort((a, b) => getRankForEntry(a) - getRankForEntry(b));
  }, [entries, searchResults]);

  const applySearchPayload = useCallback((payload) => {
    if (!payload) {
      return;
    }

    setSearchResultsState(payload.resultsState);
    setSearchStatus(payload.statusState);
  }, []);

  useEffect(() => {
    if (pathname !== '/archive') {
      return;
    }

    if (pendingSearchPayloadRef.current) {
      applySearchPayload(pendingSearchPayloadRef.current);
      pendingSearchPayloadRef.current = null;
    }
  }, [applySearchPayload, pathname]);

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
        pendingSearchPayloadRef.current = null;
        return;
      }

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
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody?.error ?? 'Search failed');
        }

        const result = await response.json();

        if (requestIdRef.current !== currentRequestId) {
          return;
        }

        const matchesAboveThreshold = Array.isArray(result?.images)
          ? result.images.filter((item) => typeof item?.similarity === 'number' && item.similarity > SIMILARITY_THRESHOLD)
          : [];

        const matchingIds = matchesAboveThreshold
          .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
          .map((item) => item.id)
          .filter(Boolean);

        const orderedUniqueIds = [];
        const seenIds = new Set();

        for (let index = 0; index < matchingIds.length; index += 1) {
          const id = matchingIds[index];
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

        const payload = {
          resultsState: { active: true, ids: [], orderedIds: [] },
          statusState: {
            status: 'error',
            query: trimmedQuery,
            summary: null,
            error: error.message ?? 'Search failed',
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
    pendingSearchPayloadRef.current = null;
  }, []);

  /**
   * When the user leaves the archive we reset any active search so that a future visit
   * starts from the default list view. We keep track of the last pathname visited to
   * detect the transition reliably on client navigation.
   */
  useEffect(() => {
    if (!pathname) {
      previousPathRef.current = pathname;
      return;
    }

    if (previousPathRef.current === '/archive' && pathname !== '/archive') {
      clearSearch();
    }

    previousPathRef.current = pathname;
  }, [clearSearch, pathname]);

  /**
   * All pieces of state and helper actions are memoised into a stable object, ensuring
   * consumers only re-render when something meaningful changes (entries, filters, view,
   * or search state). This keeps the archive UI responsive even with the artificial
   * data multiplication in place.
   */
  const value = useMemo(
    () => ({
      entries,
      visibleEntries: filtered,
      view,
      setView,
      searchStatus,
      runSearch,
      clearSearch,
    }),
    [clearSearch, entries, filtered, runSearch, searchStatus, setView, view]
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

