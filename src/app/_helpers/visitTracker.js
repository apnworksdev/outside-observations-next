/**
 * Visit Tracker Utilities
 *
 * Tracks whether a user has visited the website before (any page).
 * Uses localStorage as the single source of truth (client-side only).
 *
 * The first-visit animation on home page should only show if:
 * 1. It's the user's first visit to the website, AND
 * 2. The first page they visit happens to be the home page
 *
 * Note: The server cannot read localStorage, so "returning visitor" is resolved
 * client-side in HomeContent after hydration.
 */

const WEBSITE_VISIT_KEY = 'has_visited_website';

import { getLocalStorage, setLocalStorage } from './localStorage';

/**
 * Check if this is the user's first visit to the website (any page)
 * @returns {boolean} True if first website visit, false if returning
 */
export const isFirstWebsiteVisit = () => {
  if (typeof window === 'undefined') return true;

  try {
    const value = getLocalStorage(WEBSITE_VISIT_KEY);
    return value !== 'true';
  } catch {
    return true;
  }
};

/**
 * Mark that the user has visited the website (any page)
 */
export const markWebsiteAsVisited = () => {
  if (typeof window === 'undefined') return;

  try {
    setLocalStorage(WEBSITE_VISIT_KEY, 'true');
  } catch {
    // Silently fail if localStorage is unavailable
  }
};
