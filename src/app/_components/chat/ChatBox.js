'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useArchiveSearchState } from '@/app/_components/Archive/providers/ArchiveSearchStateProvider';
import { useArchiveEntriesSafe } from '@/app/_components/Archive/providers/ArchiveEntriesProvider';
import { useChatStorage } from '@/app/_hooks/chat/useChatStorage';
import { trackChatMessageSent, trackChatPanelOpen } from '@/app/_helpers/analytics/gtag';
import styles from '@app/_assets/chat/chat-box.module.css';
import TypewriterMessage from './TypewriterMessage';
import ExploreArchiveLink from './ExploreArchiveLink';
import Linkify from './Linkify';
import { useChatAutoScroll } from './useChatAutoScroll';
import { useChatFirstMessage } from './useChatFirstMessage';
import {
  DEFAULT_FIRST_MESSAGE,
  buildConversationPayload,
  createArchiveSearchPayload,
  resolveChatErrorMessage,
} from './chatBoxUtils';

export default function ChatBox({ variant = 'home' }) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [navigatingMessageId, setNavigatingMessageId] = useState(null);
  const textareaRef = useRef(null);
  const chatBoxContentRef = useRef(null);
  const imagesMessageAddedRef = useRef(new Set());
  const router = useRouter();
  
  // Get setSearchPayload from global search state provider
  // Available from any page since it's in root layout
  const { setSearchPayload } = useArchiveSearchState();
  
  // Get setSearchFromPayload from archive entries provider (only available on archive page)
  // Use safe hook that returns null if not within provider
  const archiveEntries = useArchiveEntriesSafe();
  const setSearchFromPayload = archiveEntries?.setSearchFromPayload;

  const messageIdRef = useRef(0);
  
  // Initialize messages with default state (same on server and client to avoid hydration mismatch)
  const [messages, setMessages] = useState([
    {
      id: 0,
      text: DEFAULT_FIRST_MESSAGE,
      sender: 'bot',
      isLoading: false
    }
  ]);
  
  // Use custom hook for chat storage persistence
  // This hook handles loading chat history on mount and saving on updates
  // Chat history is shared across home and archive variants
  useChatStorage(messages, setMessages, messageIdRef);

  // GA4: track chat "open" on home (chat is in-page; archive open is tracked from menu)
  const chatOpenTrackedRef = useRef(false);
  useEffect(() => {
    if (variant === 'home' && !chatOpenTrackedRef.current) {
      chatOpenTrackedRef.current = true;
      trackChatPanelOpen('home');
    }
  }, [variant]);

  // Helper function to update the first message (id: 0) with given text
  const updateFirstMessage = useCallback((text) => {
    setMessages((currentMessages) => {
      const firstMessageIndex = currentMessages.findIndex(msg => msg.id === 0);
      
      if (firstMessageIndex >= 0) {
        // Update existing first message
        const newMessages = [...currentMessages];
        newMessages[firstMessageIndex] = {
          ...newMessages[firstMessageIndex],
          text,
        };
        return newMessages;
      } else {
        // Add first message at the beginning if it doesn't exist
        return [
          {
            id: 0,
            text,
            sender: 'bot',
            isLoading: false
          },
          ...currentMessages
        ];
      }
    });
  }, []);

  useChatFirstMessage(updateFirstMessage, DEFAULT_FIRST_MESSAGE);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    
    // Auto-grow textarea (fallback for browsers without field-sizing support)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleKeyDown = (e) => {
    // Submit form on Enter, allow new line with Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Reset textarea height when input is cleared
  useEffect(() => {
    if (!inputValue && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [inputValue]);

  // Function to trigger archive search using already-fetched item IDs (no API call!)
  const triggerArchiveSearch = (messageId, itemIds, searchQuery) => {
    if (!itemIds || itemIds.length === 0 || !searchQuery) return;

    setNavigatingMessageId(messageId);

    const payload = createArchiveSearchPayload(itemIds, searchQuery);

    // Set search payload in global provider (available from root layout)
    setSearchPayload(payload);
    
    // Navigate to archive page
    // ArchiveEntriesProvider will consume the payload on mount
    router.push('/archive');
  };

  // Reset loading state on unmount
  useEffect(() => {
    return () => {
      setNavigatingMessageId(null);
    };
  }, []);

  // Prefetch archive route when images appear (for faster navigation) - only for 'home' variant
  useEffect(() => {
    if (variant === 'home') {
      const hasImageMessages = messages.some(
        (msg) => msg.isImageMessage && msg.imageEntries && msg.imageEntries.length > 0
      );
      if (hasImageMessages) {
        router.prefetch('/archive');
      }
    }
  }, [messages, router, variant]);

  useChatAutoScroll(chatBoxContentRef, messages);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      const userMessage = inputValue.trim();

      trackChatMessageSent(userMessage, variant);

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: messageIdRef.current++,
          text: userMessage,
          sender: 'user',
          isLoading: false
        }
      ]);

      // Add loading bot message
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: messageIdRef.current++,
          text: '',
          sender: 'bot',
          isLoading: true
        }
      ]);

      // Clear input and disable form
      setInputValue('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setIsLoading(true);

      try {
        const fullConversation = buildConversationPayload(messages, userMessage);

        if (!fullConversation.trim()) {
          setIsLoading(false);
          setMessages((prev) => prev.slice(0, -1)); // remove loading message
          setInputValue(userMessage);
          return;
        }

        const response = await fetch('/api/vector-store/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: fullConversation,
            maxItems: 50,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody?.error ?? 'Failed to get response');
        }

        const result = await response.json();

        // Extract text response
        const botResponse = result.response || result.text || result.message || 'I received your message.';
        
        // Extract query for archive search (prefer rewritten_query, fallback to original_query or user message)
        const searchQuery = result?.rewritten_query || result?.original_query || userMessage;
        
        // Check if response has itemIds and fetch them by ID
        const itemIds = Array.isArray(result?.itemIds) && result.itemIds.length > 0 
          ? result.itemIds.filter((id) => typeof id === 'string' && id.trim().length > 0)
          : [];

        // If variant is 'archive', filter directly instead of showing ExploreArchiveLink
        if (variant === 'archive' && itemIds.length > 0) {
          if (setSearchFromPayload) {
            try {
              const payload = createArchiveSearchPayload(itemIds, searchQuery);

              // Apply search directly to filter archive items
              setSearchFromPayload(payload);
            } catch (error) {
              // Log error but don't break the chat flow
              console.error('ChatBox: Error applying archive filter:', error);
            }
          } else {
            // This shouldn't happen if ChatBox is properly used within ArchiveEntriesProvider
            // But log a warning for debugging
            console.warn('ChatBox: setSearchFromPayload not available in archive variant. Make sure ChatBox is used within ArchiveEntriesProvider.');
          }
        }

        // Fetch archive entries by IDs (only if we have item IDs and variant is 'home')
        // For 'archive' variant, we don't need to fetch entries since we're filtering directly
        let matchedEntries = [];
        if (variant === 'home' && itemIds.length > 0) {
          try {
            const entriesResponse = await fetch('/api/archive-entries/by-ids', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ ids: itemIds }),
            });

            if (entriesResponse.ok) {
              const entriesData = await entriesResponse.json();
              matchedEntries = Array.isArray(entriesData?.entries) ? entriesData.entries : [];
            } else {
              console.error('Failed to fetch archive entries by IDs:', entriesResponse.status);
            }
          } catch (error) {
            console.error('Error fetching archive entries by IDs:', error);
            // Continue without images if fetch fails
          }
        }

        // Replace loading message with bot response
        setMessages((prevMessages) => {
          const newMessages = [...prevMessages];
          const lastIndex = newMessages.length - 1;
          if (newMessages[lastIndex]?.sender === 'bot' && newMessages[lastIndex]?.isLoading) {
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              text: typeof botResponse === 'string' ? botResponse.trim() : String(botResponse || '').trim(),
              isLoading: false,
              // Only include imageEntries and itemIds for 'home' variant
              imageEntries: variant === 'home' && matchedEntries.length > 0 ? matchedEntries : null,
              itemIds: variant === 'home' && itemIds.length > 0 ? itemIds : null,
              searchQuery: variant === 'home' && matchedEntries.length > 0 ? searchQuery : null
            };
          }
          return newMessages;
        });
      } catch (error) {
        console.error('ChatBox: Error fetching response:', error);
        
        const errorMessage = resolveChatErrorMessage(error);
        
        // Replace loading message with error message
        setMessages((prevMessages) => {
          const newMessages = [...prevMessages];
          const lastIndex = newMessages.length - 1;
          if (newMessages[lastIndex]?.sender === 'bot' && newMessages[lastIndex]?.isLoading) {
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              text: typeof errorMessage === 'string' ? errorMessage.trim() : String(errorMessage || '').trim(),
              isLoading: false,
              isError: true, // Mark as error for styling
            };
          }
          return newMessages;
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className={styles.chatBox} data-variant={variant}>
      <div ref={chatBoxContentRef} className={styles.chatBoxContent}>
        {messages.map((message, index) => {
          const messageKey = message.id;
          const hasImages = message.imageEntries && message.imageEntries.length > 0;
          const imagesAlreadyAdded = imagesMessageAddedRef.current.has(messageKey);
          // Only add data attribute to the first message (index 0)
          const isFirstMessage = index === 0;
          
          return (
            <div key={message.id} className={styles.chatBoxMessageContainer}>
              {/* Text message */}
              {!message.isImageMessage && (
                <div 
                  data-sender={message.sender} 
                  className={styles.chatBoxMessage}
                  {...(isFirstMessage && { 'data-first-visit-animate': 'first-message' })}
                >
                  <p className={styles.chatBoxMessageText}>
                    {message.sender === 'bot' ? (
                      // For first message during first visit, render text directly (FirstVisitAnimation controls it)
                      // Skip animation for loaded messages - show text immediately
                      isFirstMessage && !message.isLoaded ? (
                        <Linkify>{message.text}</Linkify>
                      ) : message.isLoaded ? (
                        <Linkify>{message.text}</Linkify>
                      ) : (
                        <TypewriterMessage
                          text={message.text}
                          isLoading={message.isLoading}
                          onComplete={
                            variant === 'home' && hasImages && !imagesAlreadyAdded
                              ? () => {
                                  // Mark images as added for this message
                                  imagesMessageAddedRef.current.add(messageKey);
                                  // Add a new message with images after typewriter completes
                                  setMessages((prevMessages) => {
                                    const currentIndex = prevMessages.findIndex((m) => m.id === messageKey);
                                    if (currentIndex === -1) return prevMessages;
                                    
                                    const newMessages = [...prevMessages];
                                    // Insert images message right after the current text message
                                    newMessages.splice(currentIndex + 1, 0, {
                                      id: messageIdRef.current++,
                                      sender: 'bot',
                                      isLoading: false,
                                      imageEntries: message.imageEntries,
                                      itemIds: message.itemIds,
                                      searchQuery: message.searchQuery,
                                      isImageMessage: true
                                    });
                                    return newMessages;
                                  });
                                }
                              : undefined
                          }
                        />
                      )
                    ) : (
                      <Linkify>{message.text}</Linkify>
                    )}
                  </p>
                </div>
              )}
              
              {/* Images message (rendered as separate message) - only for 'home' variant */}
              {variant === 'home' && message.isImageMessage && message.imageEntries && (
                <ExploreArchiveLink
                  messageId={message.id}
                  itemIds={message.itemIds}
                  searchQuery={message.searchQuery}
                  imageEntries={message.imageEntries}
                  navigatingMessageId={navigatingMessageId}
                  onTriggerSearch={triggerArchiveSearch}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className={styles.chatBoxFormContainer}>
        <form onSubmit={handleSubmit} className={styles.chatBoxForm} data-first-visit-animate="form-element">
          <textarea
            ref={textareaRef}
            className={styles.chatBoxFormInput}
            id="chat-input"
            name="message"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Share a thought..."
            disabled={isLoading}
            autoComplete="off"
            rows={1}
          />
          <button
            type="submit"
            disabled={isLoading}
            className={`${styles.chatBoxFormSubmit} ${!inputValue.trim() ? styles.chatBoxFormSubmitHidden : ''}`}
          >
            <span>Send</span>
          </button>
        </form>
        {variant === 'home' && (
          <>
            <div className={`${styles.chatBoxLine} ${styles.topLine}`} data-first-visit-animate="form-line" />
            <div className={`${styles.chatBoxLine} ${styles.bottomLine}`} data-first-visit-animate="form-line" />
            <div className={`${styles.chatBoxCircle} ${styles.topRightCircle}`} data-first-visit-animate="form-element" />
            <div className={`${styles.chatBoxCircle} ${styles.bottomRightCircle}`} data-first-visit-animate="form-element" />
            <div className={`${styles.chatBoxCircle} ${styles.bottomLeftCircle}`} data-first-visit-animate="form-element" />
            <div className={`${styles.chatBoxCircle} ${styles.topLeftCircle}`} data-first-visit-animate="form-element" />
          </>
        )}
      </div>
    </div>
  );
}
