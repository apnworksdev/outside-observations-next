'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  VIEW_CHANGE_EVENT,
  ARCHIVE_FILTERS_CLEAR_EVENT,
  ARCHIVE_FILTERS_CHANGE_EVENT,
  setArchiveViewPreference,
  SESSION_STORAGE_KEYS,
  readFromSessionStorage,
  readArchiveViewFromStorage,
} from '@/app/_components/Archive/state/archiveStorage';
import { trackArchiveViewSwitch, trackArchiveFiltersClear } from '@/app/_helpers/analytics/gtag';

function readStoredArchiveView() {
  if (typeof window === 'undefined') {
    return 'images';
  }
  return readArchiveViewFromStorage();
}

export function useArchiveViewToggleState({ archiveContext, initialExternalView = 'images', pathname }) {
  const [externalView, setExternalView] = useState(initialExternalView);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const isomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

  isomorphicLayoutEffect(() => {
    if (archiveContext) {
      return;
    }
    setExternalView(readStoredArchiveView());
  }, [archiveContext]);

  useEffect(() => {
    if (archiveContext) {
      return undefined;
    }

    const handleExternalChange = (event) => {
      const nextView = event?.detail?.view;
      if (nextView === 'images' || nextView === 'list') {
        setExternalView(nextView);
      }
    };

    window.addEventListener(VIEW_CHANGE_EVENT, handleExternalChange);
    return () => {
      window.removeEventListener(VIEW_CHANGE_EVENT, handleExternalChange);
    };
  }, [archiveContext]);

  const currentView = archiveContext?.view ?? externalView;

  const handleSetView = useCallback((nextView) => {
    if (nextView !== 'images' && nextView !== 'list') {
      return;
    }
    if (currentView !== nextView) {
      trackArchiveViewSwitch(nextView);
    }

    if (archiveContext?.setView) {
      archiveContext.setView(nextView);
    } else {
      setArchiveViewPreference(nextView);
      setExternalView(nextView);
    }
  }, [archiveContext, currentView]);

  const checkActiveFilters = useCallback(() => {
    if (archiveContext) {
      const hasSearch = archiveContext.searchStatus?.query !== null;
      const hasMoodTags = archiveContext.selectedMoodTags?.length > 0;
      return hasSearch || hasMoodTags;
    }

    if (typeof window === 'undefined') {
      return false;
    }

    const searchStatus = readFromSessionStorage(SESSION_STORAGE_KEYS.SEARCH_STATUS, { query: null });
    const moodTags = readFromSessionStorage(SESSION_STORAGE_KEYS.MOOD_TAGS, []);
    return searchStatus?.query !== null || moodTags?.length > 0;
  }, [archiveContext]);

  const searchQuery = archiveContext?.searchStatus?.query;
  const moodTagsLength = archiveContext?.selectedMoodTags?.length;

  useEffect(() => {
    if (archiveContext) {
      const hasSearch = searchQuery !== null;
      const hasMoodTags = (moodTagsLength ?? 0) > 0;
      setHasActiveFilters(hasSearch || hasMoodTags);
    }
  }, [archiveContext, searchQuery, moodTagsLength]);

  useEffect(() => {
    if (!archiveContext && typeof window !== 'undefined') {
      setHasActiveFilters(checkActiveFilters());
    }
  }, [archiveContext, pathname, checkActiveFilters]);

  const filterChangeEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
  filterChangeEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleFilterChange = (event) => {
      const { hasActiveFilters: newHasActiveFilters } = event.detail || {};
      if (typeof newHasActiveFilters === 'boolean') {
        setHasActiveFilters(newHasActiveFilters);
      }
    };

    window.addEventListener(ARCHIVE_FILTERS_CHANGE_EVENT, handleFilterChange);
    return () => {
      window.removeEventListener(ARCHIVE_FILTERS_CHANGE_EVENT, handleFilterChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || archiveContext) {
      return;
    }

    const handleStorageChange = (e) => {
      if (
        e.key === SESSION_STORAGE_KEYS.SEARCH_STATUS ||
        e.key === SESSION_STORAGE_KEYS.MOOD_TAGS
      ) {
        setHasActiveFilters(checkActiveFilters());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [archiveContext, checkActiveFilters]);

  const handleClearFilters = useCallback(() => {
    let hadSearch = false;
    let hadMood = false;
    try {
      if (archiveContext) {
        hadSearch = !!archiveContext.searchStatus?.query;
        hadMood = (archiveContext.selectedMoodTags?.length ?? 0) > 0;
      } else if (typeof window !== 'undefined') {
        const searchStatus = readFromSessionStorage(SESSION_STORAGE_KEYS.SEARCH_STATUS, { query: null });
        const moodTags = readFromSessionStorage(SESSION_STORAGE_KEYS.MOOD_TAGS, []);
        hadSearch = searchStatus?.query != null;
        hadMood = Array.isArray(moodTags) && moodTags.length > 0;
      }
    } catch {
      // SessionStorage can throw; still clear filters below.
    }
    trackArchiveFiltersClear(hadSearch, hadMood);

    if (archiveContext?.clearAllFilters) {
      archiveContext.clearAllFilters();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(ARCHIVE_FILTERS_CLEAR_EVENT));
    }
  }, [archiveContext]);

  return {
    currentView,
    hasActiveFilters,
    handleSetView,
    handleClearFilters,
  };
}
