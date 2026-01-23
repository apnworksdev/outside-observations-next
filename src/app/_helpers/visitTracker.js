/**
 * Visit Tracker Utilities
 * 
 * Tracks whether a user has visited the website before (any page).
 * Uses cookie as the single source of truth (accessible by both middleware and client-side).
 * localStorage is synced from cookie for backwards compatibility but is not the source of truth.
 * 
 * The first-visit animation on home page should only show if:
 * 1. It's the user's first visit to the website, AND
 * 2. The first page they visit happens to be the home page
 */

// Cookie name for website visit tracking (single source of truth)
const VISIT_COOKIE_NAME = 'has_visited_website';
// localStorage key (synced from cookie, for backwards compatibility)
const WEBSITE_VISIT_KEY = 'has_visited_website';

import { getCookie, setCookie } from './cookies';

/**
 * Check if this is the user's first visit to the website (any page)
 * Uses cookie as the single source of truth (same as middleware)
 * localStorage is synced FROM cookie, but cookie is never synced FROM localStorage
 * @returns {boolean} True if first website visit, false if returning
 */
export const isFirstWebsiteVisit = () => {
  if (typeof window === 'undefined') return true;
  
  try {
    // Check cookie first (single source of truth - same as middleware)
    const cookieValue = getCookie(VISIT_COOKIE_NAME);
    if (cookieValue === 'true') {
      // Cookie exists - sync to localStorage for backwards compatibility
      try {
        localStorage.setItem(WEBSITE_VISIT_KEY, 'true');
      } catch {
        // Ignore localStorage errors
      }
      return false; // Not a first visit
    }
    
    // No cookie found - this is a first visit
    // Note: We don't check localStorage here because cookie is the source of truth.
    // If localStorage exists but cookie doesn't, we treat it as a first visit
    // (cookie might have been deleted intentionally)
    return true;
  } catch {
    // If cookies fail, treat as first visit
    return true;
  }
};

/**
 * Mark that the user has visited the website (any page)
 * Sets cookie as the source of truth, and syncs localStorage for backwards compatibility
 */
export const markWebsiteAsVisited = () => {
  if (typeof window === 'undefined') return;
  
  try {
    // Check if cookie already exists to avoid unnecessary writes
    const existingCookie = getCookie(VISIT_COOKIE_NAME);
    if (existingCookie === 'true') {
      // Cookie exists, just sync localStorage
      try {
        localStorage.setItem(WEBSITE_VISIT_KEY, 'true');
      } catch {
        // Ignore localStorage errors
      }
      return;
    }
    
    // Set cookie (single source of truth)
    setCookie(VISIT_COOKIE_NAME, 'true', { expiresYears: 1 });
    
    // Sync to localStorage for backwards compatibility
    try {
      localStorage.setItem(WEBSITE_VISIT_KEY, 'true');
    } catch {
      // Ignore localStorage errors
    }
  } catch {
    // Silently fail if cookies/localStorage are unavailable
  }
};
