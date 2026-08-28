'use client';

import { useEffect } from 'react';
import { SESSION_STORAGE_KEYS, readFromSessionStorage, removeFromSessionStorage } from './archiveStorage';

export function useRestoreArchiveState({
  pathname,
  setSearchResultsState,
  setSearchStatus,
  setSorting,
  setSelectedMoodTags,
  searchQueryRef,
  selectedMoodTagsRef,
}) {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (pathname !== '/archive' && !pathname.startsWith('/archive/entry/')) {
      return;
    }

    const urlQuery =
      pathname === '/archive'
        ? new URLSearchParams(window.location.search).get('search')?.trim()
        : null;
    const searchRestorable = pathname !== '/archive' || Boolean(urlQuery);
    if (!searchRestorable) {
      removeFromSessionStorage(SESSION_STORAGE_KEYS.SEARCH_RESULTS);
      removeFromSessionStorage(SESSION_STORAGE_KEYS.SEARCH_STATUS);
    }

    const storedSearchResults = searchRestorable
      ? readFromSessionStorage(SESSION_STORAGE_KEYS.SEARCH_RESULTS, null)
      : null;
    const storedSearchStatus = searchRestorable
      ? readFromSessionStorage(SESSION_STORAGE_KEYS.SEARCH_STATUS, null)
      : null;
    const storedSorting = readFromSessionStorage(SESSION_STORAGE_KEYS.SORTING, null);
    const storedMoodTags = readFromSessionStorage(SESSION_STORAGE_KEYS.MOOD_TAGS, null);

    if (storedSearchResults !== null) {
      setSearchResultsState(storedSearchResults);
    }
    if (storedSearchStatus !== null) {
      setSearchStatus(storedSearchStatus);
      searchQueryRef.current = storedSearchStatus?.query ?? null;
    }
    if (storedSorting !== null) {
      setSorting(storedSorting);
    }
    if (storedMoodTags !== null) {
      setSelectedMoodTags(storedMoodTags);
      selectedMoodTagsRef.current = storedMoodTags;
    }
  }, [pathname, searchQueryRef, selectedMoodTagsRef, setSearchResultsState, setSearchStatus, setSorting, setSelectedMoodTags]);
}

export function useSyncArchiveFilterRefs({ searchStatus, selectedMoodTags, searchQueryRef, selectedMoodTagsRef }) {
  useEffect(() => {
    searchQueryRef.current = searchStatus?.query ?? null;
  }, [searchQueryRef, searchStatus?.query]);

  useEffect(() => {
    selectedMoodTagsRef.current = selectedMoodTags;
  }, [selectedMoodTags, selectedMoodTagsRef]);
}
