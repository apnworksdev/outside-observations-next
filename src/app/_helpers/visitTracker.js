/**
 * Visit Tracker Utilities
 * 
 * Tracks whether a user has visited the website before (any page).
 * Uses localStorage with sessionId to persist across page refreshes.
 * 
 * The first-visit animation on home page should only show if:
 * 1. It's the user's first visit to the website, AND
 * 2. The first page they visit happens to be the home page
 */

import { getSessionId } from './chatStorage';

const getWebsiteVisitKey = (sessionId) => `has_visited_website_${sessionId}`;

/**
 * Check if this is the user's first visit to the website (any page)
 * @returns {boolean} True if first website visit, false if returning
 */
export const isFirstWebsiteVisit = () => {
  if (typeof window === 'undefined') return true;
  
  try {
    const sessionId = getSessionId();
    if (!sessionId) return true;
    
    const hasVisited = localStorage.getItem(getWebsiteVisitKey(sessionId));
    return hasVisited !== 'true';
  } catch {
    // If localStorage fails, treat as first visit
    return true;
  }
};

/**
 * Mark that the user has visited the website (any page)
 * This should be called on any page load to track website visits
 * Sets both localStorage (for client-side checks) and cookie (for middleware)
 */
export const markWebsiteAsVisited = () => {
  if (typeof window === 'undefined') return;
  
  try {
    const sessionId = getSessionId();
    if (!sessionId) return;
    
    // Check if already marked to avoid unnecessary writes
    const visitKey = getWebsiteVisitKey(sessionId);
    const alreadyVisited = localStorage.getItem(visitKey) === 'true';
    
    // Set localStorage (for client-side checks)
    localStorage.setItem(visitKey, 'true');
    
    // Set cookie for middleware to check (only if not already set to avoid unnecessary writes)
    // Parse cookies more robustly (handle spaces and edge cases)
    const cookies = document.cookie.split(';').map(c => c.trim());
    const existingCookie = cookies.find(c => c.startsWith('has_visited_website='));
    
    // Set cookie if it doesn't exist, or if localStorage says we haven't visited
    // (cookie might be out of sync, so we sync it)
    if (!existingCookie || !alreadyVisited) {
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      
      // Add Secure flag if on HTTPS (production) for better security
      const isSecure = window.location.protocol === 'https:';
      const secureFlag = isSecure ? '; Secure' : '';
      
      document.cookie = `has_visited_website=true; expires=${expires.toUTCString()}; path=/; SameSite=Lax${secureFlag}`;
    }
  } catch {
    // Silently fail if localStorage/cookies are unavailable
  }
};
