/**
 * Cookie Utilities
 * 
 * Shared utilities for reading and writing cookies across the application.
 * Uses consistent patterns for security (SameSite, Secure flag, etc.)
 */

/**
 * Get cookie value by name
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value or null if not found
 */
export const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  
  try {
    const cookies = document.cookie.split(';').map(c => c.trim());
    const cookie = cookies.find(c => c.startsWith(`${name}=`));
    return cookie ? cookie.split('=')[1] : null;
  } catch {
    return null;
  }
};

/**
 * Set a cookie with standard security settings
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {Object} [options] - Optional settings
 * @param {number} [options.maxAge] - Max age in seconds (alternative to expires)
 * @param {Date} [options.expires] - Expiration date (alternative to maxAge)
 * @param {number} [options.expiresYears] - Expiration in years from now (default: 1)
 * @param {string} [options.path] - Cookie path (default: '/')
 * @param {boolean} [options.secure] - Use Secure flag (default: auto-detect from protocol)
 * @param {string} [options.sameSite] - SameSite attribute (default: 'Lax')
 */
export const setCookie = (name, value, options = {}) => {
  if (typeof window === 'undefined') return;
  
  try {
    let expires = '';
    
    if (options.expires) {
      expires = `expires=${options.expires.toUTCString()}`;
    } else if (options.maxAge) {
      expires = `max-age=${options.maxAge}`;
    } else {
      // Default: 1 year from now
      const expirationDate = new Date();
      const years = options.expiresYears || 1;
      expirationDate.setFullYear(expirationDate.getFullYear() + years);
      expires = `expires=${expirationDate.toUTCString()}`;
    }
    
    const path = options.path || '/';
    const sameSite = options.sameSite || 'Lax';
    
    // Auto-detect Secure flag if not explicitly set
    let secureFlag = '';
    if (options.secure !== undefined) {
      secureFlag = options.secure ? '; Secure' : '';
    } else {
      // Auto-detect: use Secure on HTTPS
      const isSecure = window.location.protocol === 'https:';
      secureFlag = isSecure ? '; Secure' : '';
    }
    
    document.cookie = `${name}=${value}; ${expires}; path=${path}; SameSite=${sameSite}${secureFlag}`;
  } catch {
    // Silently fail if cookies are unavailable
  }
};

/**
 * Delete a cookie
 * @param {string} name - Cookie name
 * @param {string} [path] - Cookie path (default: '/')
 */
export const deleteCookie = (name, path = '/') => {
  if (typeof window === 'undefined') return;
  
  try {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
  } catch {
    // Silently fail if cookies are unavailable
  }
};
