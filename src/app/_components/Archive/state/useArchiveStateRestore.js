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

    // Entry pages share this provider, and the pager walks the same filtered
    // list, so the stored filters must be restored there too.
    if (pathname !== '/archive' && !pathname.startsWith('/archive/entry/')) {
      return;
    }

    // On the archive index the URL is the single source of truth for the
    // search: /archive without ?search= means no search, whatever the session
    // storage still holds (a stale filter here silently empties the grid with
    // a blank field). Entry pages have no search param, so they still restore
    // -- the pager needs the filtered list.
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
