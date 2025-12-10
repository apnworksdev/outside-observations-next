/**
 * Chat Storage Utilities
 * 
 * Handles localStorage persistence for chat messages.
 * Uses sessionId from visitor tracking to maintain chat history across page refreshes.
 */

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

// Generate localStorage key for chat history
export const getChatStorageKey = (sessionId) => `chat_history_${sessionId}`;

/**
 * Load chat messages from localStorage
 * @param {string} sessionId - Visitor session ID
 * @returns {Array|null} Array of messages or null if not found/invalid
 */
export const loadChatFromStorage = (sessionId) => {
  if (!isLocalStorageAvailable() || !sessionId) return null;
  
  try {
    const stored = localStorage.getItem(getChatStorageKey(sessionId));
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
      if (sessionId) {
        localStorage.removeItem(getChatStorageKey(sessionId));
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }
  return null;
};

/**
 * Save chat messages to localStorage
 * @param {string} sessionId - Visitor session ID
 * @param {Array} messages - Array of message objects
 */
export const saveChatToStorage = (sessionId, messages) => {
  if (!isLocalStorageAvailable() || !sessionId || !messages || messages.length === 0) return;
  
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
    
    localStorage.setItem(getChatStorageKey(sessionId), JSON.stringify(messagesToSave));
  } catch (error) {
    console.error('Error saving chat to localStorage:', error);
    // Handle quota exceeded error gracefully
    if (error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, chat history not saved');
      // Try to clean up old chats if quota is exceeded
      try {
        const keys = Object.keys(localStorage);
        const chatKeys = keys.filter(key => key.startsWith('chat_history_'));
        if (chatKeys.length > 1) {
          // Remove oldest chat (simple cleanup - could be improved)
          localStorage.removeItem(chatKeys[0]);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
  }
};

/**
 * Get session ID from sessionStorage (same one used by VisitorTracker)
 * @returns {string|null} Session ID or null if not available
 */
export const getSessionId = () => {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('visitor_session_id');
};
