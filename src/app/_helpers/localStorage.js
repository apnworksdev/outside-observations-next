/**
 * LocalStorage Utilities
 * 
 * Shared utilities for reading and writing to localStorage across the application.
 * Handles SSR safety and errors gracefully.
 */

/**
 * Get localStorage value by key
 * @param {string} key - Storage key
 * @returns {string|null} Stored value or null if not found
 */
export const getLocalStorage = (key) => {
  if (typeof window === 'undefined') return null;
  
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Silently fail if localStorage is unavailable (e.g., private browsing)
    return null;
  }
};

/**
 * Set a value in localStorage
 * @param {string} key - Storage key
 * @param {string} value - Value to store
 */
export const setLocalStorage = (key, value) => {
  if (typeof window === 'undefined') return;
  
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Silently fail if localStorage is unavailable (e.g., quota exceeded, private browsing)
  }
};

/**
 * Remove a value from localStorage
 * @param {string} key - Storage key
 */
export const removeLocalStorage = (key) => {
  if (typeof window === 'undefined') return;
  
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Silently fail if localStorage is unavailable
  }
};
