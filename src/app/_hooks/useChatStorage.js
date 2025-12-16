'use client';

import { useEffect, useRef } from 'react';
import { loadChatFromStorage, saveChatToStorage, cleanupOldChatStorage } from '@/app/_helpers/chatStorage';

/**
 * Custom hook for managing chat storage persistence
 * 
 * Handles:
 * - Loading chat history on mount (shared across home and archive)
 * - Saving chat messages with debouncing
 * - Cleanup of old sessionId-based storage keys
 * 
 * @param {Array} messages - Current messages array
 * @param {Function} setMessages - State setter for messages
 * @param {Object} messageIdRef - Ref to track message ID counter
 */
export function useChatStorage(messages, setMessages, messageIdRef) {
  const saveTimeoutRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const messagesRef = useRef(messages);

  // Keep messagesRef in sync with messages state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Clean up old sessionId-based storage keys on mount (one-time cleanup)
  useEffect(() => {
    cleanupOldChatStorage();
  }, []);

  // Load chat history on mount
  useEffect(() => {
    if (isInitialLoadRef.current) {
      const savedMessages = loadChatFromStorage();
      
      if (savedMessages && savedMessages.length > 0) {
        // Restore messageIdRef to be higher than the highest saved message ID
        const ids = savedMessages.map(msg => msg.id || 0).filter(id => typeof id === 'number');
        const maxId = ids.length > 0 ? Math.max(...ids) : 0;
        messageIdRef.current = maxId + 1;
        isInitialLoadRef.current = false;
        // Mark all loaded messages as loaded (skip animation)
        setMessages(savedMessages.map(msg => ({ ...msg, isLoaded: true })));
        return;
      }
      
      // Fallback: try to load if we still have default welcome message
      // Capture initial messages value to avoid stale closure
      const initialMessages = messagesRef.current;
      if (initialMessages.length === 1 && initialMessages[0]?.sender === 'bot' && initialMessages[0]?.id === 0) {
        const savedMessages = loadChatFromStorage();
        if (savedMessages && savedMessages.length > 0) {
          const ids = savedMessages.map(msg => msg.id || 0).filter(id => typeof id === 'number');
          const maxId = ids.length > 0 ? Math.max(...ids) : 0;
          messageIdRef.current = maxId + 1;
          isInitialLoadRef.current = false;
          setMessages(savedMessages.map(msg => ({ ...msg, isLoaded: true })));
        }
      }
      
      isInitialLoadRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - using messagesRef to avoid dependency

  // Save chat to localStorage with debouncing
  useEffect(() => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    if (messages.length === 0) return;
    
    // Only save if there are non-loading messages
    const hasNonLoadingMessages = messages.some(msg => !msg.isLoading && msg.text !== undefined);
    if (!hasNonLoadingMessages) return;
    
    // Debounce saves to avoid excessive localStorage writes
    // Save immediately on first load, then debounce subsequent saves
    const shouldDebounce = !isInitialLoadRef.current;
    const delay = shouldDebounce ? 500 : 0; // 500ms debounce
    
    saveTimeoutRef.current = setTimeout(() => {
      saveChatToStorage(messagesRef.current);
    }, delay);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]); // setMessages is stable from useState, messagesRef is updated via separate effect

  // Save on unmount
  useEffect(() => {
    return () => {
      // Clear timeout on unmount
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Save chat one final time on unmount (in case debounce was pending)
      if (messagesRef.current.length > 0) {
        const hasNonLoadingMessages = messagesRef.current.some(msg => !msg.isLoading && msg.text !== undefined);
        if (hasNonLoadingMessages) {
          // Save synchronously on unmount (no debounce)
          saveChatToStorage(messagesRef.current);
        }
      }
    };
  }, []);
}
