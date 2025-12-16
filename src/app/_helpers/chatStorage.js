/**
 * Chat Storage Utilities
 * 
 * Handles localStorage persistence for chat messages.
 * Uses a single shared storage key to maintain chat history across pages
 * and browser sessions (shared between home and archive).
 */

// Single storage key for chat history (shared across all chat instances)
const CHAT_STORAGE_KEY = 'chat_history';

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
 * Load chat messages from localStorage
 * @returns {Array|null} Array of messages or null if not found/invalid
 */
export const loadChatFromStorage = () => {
  if (!isLocalStorageAvailable()) return null;
  
  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate it's an array with valid message structure
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Validate each message has required fields
        const validMessages = parsed.filter(msg => 
          msg && 
          typeof msg === 'object' && 
          typeof msg.id === 'number' && 
          typeof msg.text === 'string' && 
          typeof msg.sender === 'string'
        );
        return validMessages.length > 0 ? validMessages : null;
      }
    }
  } catch (error) {
    console.error('Error loading chat from localStorage:', error);
    // If data is corrupted, try to clean it up
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }
  return null;
};

/**
 * Save chat messages to localStorage
 * @param {Array} messages - Array of message objects
 */
export const saveChatToStorage = (messages) => {
  if (!isLocalStorageAvailable() || !messages || messages.length === 0) return;
  
  try {
    // Only save non-loading messages (exclude temporary loading states)
    // Also remove isLoaded flag when saving (it's only for display purposes)
    const messagesToSave = messages
      .filter(msg => !msg.isLoading && msg.text !== undefined)
      .map(msg => {
        const { isLoaded, ...messageWithoutLoadedFlag } = msg;
        return messageWithoutLoadedFlag;
      });
    
    // Don't save if we have no valid messages
    if (messagesToSave.length === 0) return;
    
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messagesToSave));
  } catch (error) {
    console.error('Error saving chat to localStorage:', error);
    // Handle quota exceeded error gracefully
    if (error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, chat history not saved');
      // Try to clean up old sessionId-based chat keys if quota is exceeded
      try {
        const keys = Object.keys(localStorage);
        // Remove old sessionId-based keys (legacy cleanup)
        const oldChatKeys = keys.filter(key => 
          key.startsWith('chat_history_visitor_')
        );
        oldChatKeys.forEach(key => localStorage.removeItem(key));
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
  }
};

/**
 * Clean up old sessionId-based chat storage keys (legacy cleanup)
 * This removes keys like 'chat_history_visitor_...' and 'chat_history_home'/'chat_history_archive'
 * that were created with the old approaches
 */
export const cleanupOldChatStorage = () => {
  if (!isLocalStorageAvailable()) return;
  
  try {
    const keys = Object.keys(localStorage);
    // Remove old sessionId-based keys (visitor_xxx)
    const oldSessionKeys = keys.filter(key => key.startsWith('chat_history_visitor_'));
    // Remove old variant-based keys (home/archive)
    const oldVariantKeys = keys.filter(key => 
      key === 'chat_history_home' || key === 'chat_history_archive'
    );
    
    const allOldKeys = [...oldSessionKeys, ...oldVariantKeys];
    allOldKeys.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    // Silently fail cleanup
  }
};
