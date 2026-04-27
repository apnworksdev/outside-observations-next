'use client';

import { useCallback, useEffect } from 'react';
import {
  ARCHIVE_FILTERS_CLEAR_EVENT,
  SESSION_STORAGE_KEYS,
  dispatchArchiveFiltersChangeEvent,
  writeToSessionStorage,
} from './archiveStorage';
import { getInitialArchiveSorting } from './archiveEntryFilters';

export function useArchiveFilterActions({
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
}) {
  const applySearchPayload = useCallback((payload) => {
    if (!payload) {
      return;
    }

    const clearedMoodTags = [];
    setSelectedMoodTags(clearedMoodTags);
    writeToSessionStorage(SESSION_STORAGE_KEYS.MOOD_TAGS, clearedMoodTags);

    setSearchResultsState(payload.resultsState);
    writeToSessionStorage(SESSION_STORAGE_KEYS.SEARCH_RESULTS, payload.resultsState);

    setSearchStatus(payload.statusState);
    writeToSessionStorage(SESSION_STORAGE_KEYS.SEARCH_STATUS, payload.statusState);
    searchQueryRef.current = payload.statusState?.query ?? null;

    const clearedSorting = getInitialArchiveSorting();
    setSortingWithStorage(clearedSorting);

    if (pathname === '/archive' && typeof window !== 'undefined') {
      const hasActiveFilters = payload.statusState?.query !== null;
      dispatchArchiveFiltersChangeEvent(hasActiveFilters);
    }
  }, [pathname, searchQueryRef, setSearchResultsState, setSearchStatus, setSelectedMoodTags, setSortingWithStorage]);

  const setSearchFromPayload = useCallback((payload) => {
    if (!payload) {
      return;
    }

    if (pathname !== '/archive') {
      setGlobalSearchPayload(payload);
      router.push('/archive');
    } else {
      applySearchPayload(payload);
    }
  }, [applySearchPayload, pathname, router, setGlobalSearchPayload]);

  useEffect(() => {
    if (pathname !== '/archive') {
      return;
    }

    if (pendingSearchPayloadRef.current) {
      applySearchPayload(pendingSearchPayloadRef.current);
      pendingSearchPayloadRef.current = null;
    }

    if (globalSearchPayload) {
      const payload = consumeSearchPayload();
      if (payload) {
        applySearchPayload(payload);
      }
    }
  }, [pathname, applySearchPayload, consumeSearchPayload, globalSearchPayload, pendingSearchPayloadRef]);

  const clearSearch = useCallback((skipEventDispatch = false) => {
    requestIdRef.current += 1;
    const clearedSearchResults = { active: false, ids: [], orderedIds: [] };
    const clearedSearchStatus = { status: 'idle', query: null, summary: null, error: null };
    const clearedSorting = getInitialArchiveSorting();

    setSearchResultsState(clearedSearchResults);
    writeToSessionStorage(SESSION_STORAGE_KEYS.SEARCH_RESULTS, clearedSearchResults);

    setSearchStatus(clearedSearchStatus);
    writeToSessionStorage(SESSION_STORAGE_KEYS.SEARCH_STATUS, clearedSearchStatus);
    searchQueryRef.current = null;

    setSortingWithStorage(clearedSorting);
    pendingSearchPayloadRef.current = null;

    if (!skipEventDispatch && pathname === '/archive' && typeof window !== 'undefined') {
      const hasActiveFilters = selectedMoodTagsRef.current.length > 0;
      dispatchArchiveFiltersChangeEvent(hasActiveFilters);
    }
  }, [pathname, pendingSearchPayloadRef, requestIdRef, searchQueryRef, selectedMoodTagsRef, setSearchResultsState, setSearchStatus, setSortingWithStorage]);

  const setMoodTag = useCallback((tagName) => {
    if (pathname !== '/archive') {
      router.push('/archive');
      return;
    }

    let nextMoodTags;
    setSelectedMoodTags((prev) => {
      nextMoodTags = prev.includes(tagName)
        ? prev.filter((tag) => tag !== tagName)
        : [...prev, tagName];
      writeToSessionStorage(SESSION_STORAGE_KEYS.MOOD_TAGS, nextMoodTags);
      return nextMoodTags;
    });

    clearSearch(true);

    if (pathname === '/archive' && typeof window !== 'undefined') {
      const hasActiveFilters = nextMoodTags.length > 0;
      dispatchArchiveFiltersChangeEvent(hasActiveFilters);
    }
  }, [clearSearch, pathname, router, setSelectedMoodTags]);

  const setMoodTags = useCallback((nextMoodTags) => {
    if (pathname !== '/archive') {
      router.push('/archive');
      return;
    }
    const tags = Array.isArray(nextMoodTags) ? nextMoodTags : [];
    setSelectedMoodTags(tags);
    writeToSessionStorage(SESSION_STORAGE_KEYS.MOOD_TAGS, tags);
    selectedMoodTagsRef.current = tags;
    clearSearch(true);
    if (pathname === '/archive' && typeof window !== 'undefined') {
      dispatchArchiveFiltersChangeEvent(tags.length > 0);
    }
  }, [clearSearch, pathname, router, selectedMoodTagsRef, setSelectedMoodTags]);

  const clearMoodTag = useCallback(() => {
    const cleared = [];
    setSelectedMoodTags(cleared);
    writeToSessionStorage(SESSION_STORAGE_KEYS.MOOD_TAGS, cleared);
    selectedMoodTagsRef.current = cleared;

    if (pathname === '/archive' && typeof window !== 'undefined') {
      const hasActiveFilters = searchQueryRef.current !== null;
      dispatchArchiveFiltersChangeEvent(hasActiveFilters);
    }
  }, [pathname, searchQueryRef, selectedMoodTagsRef, setSelectedMoodTags]);

  const clearAllFilters = useCallback(() => {
    clearSearch();
    clearMoodTag();
  }, [clearSearch, clearMoodTag]);

  useEffect(() => {
    if (typeof window === 'undefined' || pathname !== '/archive') {
      return;
    }

    const handleClearFilters = () => {
      clearAllFilters();
    };

    window.addEventListener(ARCHIVE_FILTERS_CLEAR_EVENT, handleClearFilters);
    return () => {
      window.removeEventListener(ARCHIVE_FILTERS_CLEAR_EVENT, handleClearFilters);
    };
  }, [pathname, clearAllFilters]);

  return {
    setSearchFromPayload,
    clearSearch,
    setMoodTag,
    setMoodTags,
    clearMoodTag,
    clearAllFilters,
  };
}
