"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import {
  VIEW_CHANGE_EVENT,
  readArchiveViewFromStorage,
  ARCHIVE_FILTERS_CLEAR_EVENT,
  ARCHIVE_FILTERS_CHANGE_EVENT,
  setArchiveViewPreference,
  useArchiveEntriesSafe,
  SESSION_STORAGE_KEYS,
  readFromSessionStorage,
} from '@/app/_components/Archive/ArchiveEntriesProvider';
import { trackArchiveViewSwitch, trackArchiveFiltersClear } from '@/app/_helpers/gtag';
import styles from '@app/_assets/nav.module.css';

function readViewFromStorage() {
  if (typeof window === 'undefined') {
    return 'images';
  }
  return readArchiveViewFromStorage();
}

export default function ArchiveViewToggle({ className, initialExternalView = 'images' }) {
  const archiveContext = useArchiveEntriesSafe();
  const [externalView, setExternalView] = useState(initialExternalView);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const pathname = usePathname();
  const isomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

  /**
   * The toggle is used both inside and outside the archive provider. When we don’t have
   * context we fall back to localStorage + global events, keeping the toggle in sync with
   * whatever the archive sets. Inside the provider we defer to the shared state instead.
   */
  isomorphicLayoutEffect(() => {
    if (archiveContext) {
      return;
    }

    setExternalView(readViewFromStorage());
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

  /**
   * Clicking a button either dispatches through the provider (if available) or updates
   * the stored preference + global event directly. Invalid values are ignored, and redundant clicks
   * short-circuit to avoid extra work.
   */
  const handleSetView = useCallback(
    (nextView) => {
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
    },
    [archiveContext, currentView]
  );

  /**
   * Check if there are active filters by reading from context or session storage
   */
  const checkActiveFilters = useCallback(() => {
    if (archiveContext) {
      // Use context if available
      const hasSearch = archiveContext.searchStatus?.query !== null;
      const hasMoodTags = archiveContext.selectedMoodTags?.length > 0;
      return hasSearch || hasMoodTags;
    } else {
      // Read from session storage when context is not available
      if (typeof window === 'undefined') {
        return false;
      }
      const searchStatus = readFromSessionStorage(SESSION_STORAGE_KEYS.SEARCH_STATUS, { query: null });
      const moodTags = readFromSessionStorage(SESSION_STORAGE_KEYS.MOOD_TAGS, []);
      return searchStatus?.query !== null || moodTags?.length > 0;
    }
  }, [archiveContext]);

  // Update hasActiveFilters when context changes
  const searchQuery = archiveContext?.searchStatus?.query;
  const moodTagsLength = archiveContext?.selectedMoodTags?.length;
  
  useEffect(() => {
    if (archiveContext) {
      // When context is available, check on every context change
      const hasSearch = searchQuery !== null;
      const hasMoodTags = (moodTagsLength ?? 0) > 0;
      setHasActiveFilters(hasSearch || hasMoodTags);
    }
  }, [archiveContext, searchQuery, moodTagsLength]);

  // When context is not available, check session storage on mount and pathname changes
  useEffect(() => {
    if (!archiveContext && typeof window !== 'undefined') {
      setHasActiveFilters(checkActiveFilters());
    }
  }, [archiveContext, pathname, checkActiveFilters]);

  // Listen to filter change events from ArchiveEntriesProvider
  // This allows the button to appear/disappear reactively when filters are applied or cleared
  // Using useLayoutEffect for synchronous updates before paint (faster visual feedback)
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

  // Listen to storage events to detect changes from other tabs/windows (only when no context)
  // This is a fallback for cross-tab synchronization
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

  /**
   * Clear all filters and search
   * Uses direct context method when available (fastest), otherwise dispatches event
   */
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
      // SessionStorage can throw (e.g. private mode); still clear filters below
    }
    trackArchiveFiltersClear(hadSearch, hadMood);

    if (archiveContext?.clearAllFilters) {
      archiveContext.clearAllFilters();
    } else {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(ARCHIVE_FILTERS_CLEAR_EVENT));
      }
    }
  }, [archiveContext]);

  return (
    <>
      <div className={className}>
        <p>View: </p>
        <button
          type="button"
          aria-pressed={currentView === 'images'}
          className={styles.archiveViewToggleButton}
          onClick={() => handleSetView('images')}
        >
          Images
        </button>
      <button
        type="button"
        aria-pressed={currentView === 'list'}
        className={styles.archiveViewToggleButton}
        onClick={() => handleSetView('list')}
      >
        List
      </button>
      </div>
      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleClearFilters}
          className={`${styles.archiveViewToggleButton} ${styles.navBubble}`}
        >
          Clear
        </button>
      )}
    </>
  );
}


