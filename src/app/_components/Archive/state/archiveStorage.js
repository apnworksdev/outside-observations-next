'use client';

import { getLocalStorage, setLocalStorage } from '@/app/_helpers/localStorage';

export const VIEW_STORAGE_KEY = 'outside-observations-archive-view';
export const VIEW_CHANGE_EVENT = 'outside-observations:archive-view-change';
export const ARCHIVE_FILTERS_CLEAR_EVENT = 'outside-observations:archive-filters-clear';
export const ARCHIVE_FILTERS_CHANGE_EVENT = 'outside-observations:archive-filters-change';

// Session storage keys for archive filter state
export const SESSION_STORAGE_KEYS = {
  MOOD_TAGS: 'outside-observations-archive-mood-tags',
  SORTING: 'outside-observations-archive-sorting',
  SEARCH_RESULTS: 'outside-observations-archive-search-results',
  SEARCH_STATUS: 'outside-observations-archive-search-status',
};

export function isValidArchiveView(value) {
  return value === 'images' || value === 'list';
}

export function writeArchiveViewToStorage(view) {
  if (typeof window === 'undefined') {
    return;
  }

  setLocalStorage(VIEW_STORAGE_KEY, view);
}

export function readArchiveViewFromStorage() {
  if (typeof window === 'undefined') {
    return 'images';
  }

  const value = getLocalStorage(VIEW_STORAGE_KEY);
  if (!value) {
    return 'images';
  }

  return isValidArchiveView(value) ? value : 'images';
}

export function setArchiveViewPreference(view) {
  if (!isValidArchiveView(view)) {
    return;
  }

  writeArchiveViewToStorage(view);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(VIEW_CHANGE_EVENT, { detail: { view } }));
  }
}

export function dispatchArchiveFiltersChangeEvent(hasActiveFilters) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ARCHIVE_FILTERS_CHANGE_EVENT, {
      detail: { hasActiveFilters },
    }));
  }
}

export function readFromSessionStorage(key, defaultValue) {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  try {
    const item = sessionStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item);
  } catch (error) {
    console.warn(`Failed to read from sessionStorage key "${key}":`, error);
    return defaultValue;
  }
}

export function writeToSessionStorage(key, value) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (value === null || value === undefined) {
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    console.warn(`Failed to write to sessionStorage key "${key}":`, error);
  }
}
