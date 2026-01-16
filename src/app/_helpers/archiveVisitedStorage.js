/**
 * Archive Visited Storage Utilities
 * 
 * Handles localStorage persistence for visited archive entries.
 * Stores an array of entry slugs that have been visited.
 */

// Storage key for visited archive entries
const ARCHIVE_VISITED_KEY = 'archive_visited_entries';

// Check if localStorage is available and working
export const isLocalStorageAvailable = () => {
  if (typeof window === 'undefined') return false;
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

/**
 * Load visited entries from localStorage
 * @returns {Set<string>} Set of visited entry slugs
 */
export const getVisitedEntries = () => {
  if (!isLocalStorageAvailable()) return new Set();
  
  try {
    const stored = localStorage.getItem(ARCHIVE_VISITED_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate it's an array with valid string slugs
      if (Array.isArray(parsed) && parsed.length > 0) {
        const validSlugs = parsed.filter(
          (slug) => slug && typeof slug === 'string' && slug.trim().length > 0
        );
        return new Set(validSlugs);
      }
    }
  } catch (error) {
    console.error('Error loading visited entries from localStorage:', error);
    // If data is corrupted, try to clean it up
    try {
      localStorage.removeItem(ARCHIVE_VISITED_KEY);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }
  return new Set();
};

/**
 * Check if an entry has been visited
 * @param {string} slug - Entry slug to check
 * @returns {boolean} True if entry has been visited
 */
export const isEntryVisited = (slug) => {
  if (!slug || typeof slug !== 'string') return false;
  
  const visitedEntries = getVisitedEntries();
  return visitedEntries.has(slug.trim());
};

/**
 * Mark an entry as visited
 * @param {string} slug - Entry slug to mark as visited
 */
export const markEntryAsVisited = (slug) => {
  if (!isLocalStorageAvailable() || !slug || typeof slug !== 'string') return;
  
  try {
    const visitedEntries = getVisitedEntries();
    const trimmedSlug = slug.trim();
    
    // Skip if already visited
    if (visitedEntries.has(trimmedSlug)) return;
    
    // Add to set and save
    visitedEntries.add(trimmedSlug);
    const arrayToSave = Array.from(visitedEntries);
    localStorage.setItem(ARCHIVE_VISITED_KEY, JSON.stringify(arrayToSave));
  } catch (error) {
    console.error('Error saving visited entry to localStorage:', error);
    // Handle quota exceeded error gracefully
    if (error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, visited entry not saved');
    }
  }
};

/**
 * Clear all visited entries from localStorage
 * Useful for testing or reset functionality
 */
export const clearVisitedEntries = () => {
  if (!isLocalStorageAvailable()) return;
  
  try {
    localStorage.removeItem(ARCHIVE_VISITED_KEY);
  } catch (error) {
    // Silently fail cleanup
  }
};
