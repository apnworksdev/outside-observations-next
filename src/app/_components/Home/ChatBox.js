'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useArchiveSearchState } from '@/app/_components/Archive/ArchiveSearchStateProvider';
import { loadChatFromStorage } from '@/app/_helpers/chatStorage';
import { useChatStorage } from '@/app/_hooks/useChatStorage';
import styles from '@app/_assets/home.module.css';
import TypewriterMessage from './TypewriterMessage';
import ExploreArchiveLink from './ExploreArchiveLink';

export default function ChatBox() {
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

  const messageIdRef = useRef(0);
  
  // Initialize messages - try to load from localStorage first
  const [messages, setMessages] = useState(() => {
    // Try to load saved chat on initial mount
    if (typeof window !== 'undefined') {
      const sessionId = sessionStorage.getItem('visitor_session_id');
      if (sessionId) {
        const savedMessages = loadChatFromStorage(sessionId);
        if (savedMessages && savedMessages.length > 0) {
          // Restore messageIdRef to be higher than the highest saved message ID
          const ids = savedMessages.map(msg => msg.id || 0).filter(id => typeof id === 'number');
          const maxId = ids.length > 0 ? Math.max(...ids) : 0;
          messageIdRef.current = maxId + 1;
          // Mark all loaded messages as loaded (skip animation)
          return savedMessages.map(msg => ({ ...msg, isLoaded: true }));
        }
      }
    }
    // Default welcome message if no saved chat
    return [
      {
        id: messageIdRef.current++,
        text: 'Welcome to Outside Observations®, how can I help you?',
        sender: 'bot',
        isLoading: false
      }
    ];
  });

  // Use custom hook for chat storage persistence
  useChatStorage(messages, setMessages, messageIdRef);

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

  // Function to trigger archive search using already-fetched image IDs (no API call!)
  const triggerArchiveSearch = (messageId, imageIds, searchQuery) => {
    if (!imageIds || imageIds.length === 0 || !searchQuery) return;

    setNavigatingMessageId(messageId);

    // Create ordered unique IDs (same logic as ArchiveEntriesProvider)
    const orderedUniqueIds = [];
    const seenIds = new Set();

    for (let index = 0; index < imageIds.length; index += 1) {
      const id = imageIds[index];
      if (!seenIds.has(id)) {
        seenIds.add(id);
        orderedUniqueIds.push(id);
      }
    }

    // Create payload directly from stored data (no API call!)
    const payload = {
      resultsState:
        orderedUniqueIds.length > 0
          ? { active: true, ids: orderedUniqueIds, orderedIds: orderedUniqueIds }
          : { active: true, ids: [], orderedIds: [] },
      statusState: {
        status: 'success',
        query: searchQuery,
        summary: {
          original: searchQuery,
          rewritten: searchQuery,
          matches: orderedUniqueIds.length,
          threshold: 0.1,
        },
        error: null,
      },
    };

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

  // Prefetch archive route when images appear (for faster navigation)
  useEffect(() => {
    const hasImageMessages = messages.some(
      (msg) => msg.isImageMessage && msg.imageEntries && msg.imageEntries.length > 0
    );
    if (hasImageMessages) {
      router.prefetch('/archive');
    }
  }, [messages, router]);

  // Auto-scroll to bottom when messages change or during typewriter animation
  useEffect(() => {
    const chatBoxContent = chatBoxContentRef.current;
    if (!chatBoxContent) return;

    // Scroll immediately when messages change
    chatBoxContent.scrollTop = chatBoxContent.scrollHeight;

    let lastScrollHeight = chatBoxContent.scrollHeight;
    let rafId = null;
    let needsCheck = false;

    const checkAndScroll = () => {
      if (!chatBoxContent || !needsCheck) {
        rafId = null;
        return;
      }
      
      needsCheck = false;
      
      // Batch all layout reads together to avoid layout thrashing
      const currentScrollHeight = chatBoxContent.scrollHeight;
      const currentScrollTop = chatBoxContent.scrollTop;
      const clientHeight = chatBoxContent.clientHeight;
      
      // Only auto-scroll if content height changed AND user is near the bottom
      if (currentScrollHeight !== lastScrollHeight) {
        const isNearBottom = currentScrollTop + clientHeight >= currentScrollHeight - 100;
        
        if (isNearBottom) {
          chatBoxContent.scrollTop = currentScrollHeight;
        }
        
        lastScrollHeight = currentScrollHeight;
      }
      
      rafId = null;
    };

    // Use MutationObserver to watch for text content changes (typewriter updates)
    // Check for browser support (though MutationObserver is widely supported)
    if (typeof MutationObserver === 'undefined') {
      return;
    }

    const observer = new MutationObserver(() => {
      // Schedule check on next animation frame (batched with browser paint)
      if (!needsCheck && !rafId) {
        needsCheck = true;
        rafId = requestAnimationFrame(checkAndScroll);
      }
    });

    // Observe changes to text content (for typewriter)
    observer.observe(chatBoxContent, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      const userMessage = inputValue.trim();

      // Add user message immediately
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
        const response = await fetch('/api/vector-store/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: userMessage,
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
        
        // Check if response has images and fetch them by ID
        const imageIds = Array.isArray(result?.images) && result.images.length > 0 
          ? result.images.filter((id) => typeof id === 'string' && id.trim().length > 0)
          : [];

        // Fetch archive entries by IDs (only if we have image IDs)
        let matchedEntries = [];
        if (imageIds.length > 0) {
          try {
            const entriesResponse = await fetch('/api/archive-entries/by-ids', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ ids: imageIds }),
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
              text: botResponse,
              isLoading: false,
              imageEntries: matchedEntries.length > 0 ? matchedEntries : null,
              imageIds: imageIds.length > 0 ? imageIds : null,
              searchQuery: matchedEntries.length > 0 ? searchQuery : null
            };
          }
          return newMessages;
        });
      } catch (error) {
        console.error('ChatBox: Error fetching response:', error);
        
        // Determine user-friendly error message
        let errorMessage = 'Sorry, I encountered an error. Please try again.';
        
        if (error instanceof TypeError && error.message.includes('fetch')) {
          errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
        } else if (error.message) {
          // Use the error message if it's user-friendly, otherwise use default
          const message = error.message.toLowerCase();
          if (message.includes('network') || message.includes('fetch')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else if (message.includes('timeout')) {
            errorMessage = 'Request timed out. Please try again.';
          } else if (message.length < 100) {
            // Use error message if it's short (likely user-friendly)
            errorMessage = error.message;
          }
        }
        
        // Replace loading message with error message
        setMessages((prevMessages) => {
          const newMessages = [...prevMessages];
          const lastIndex = newMessages.length - 1;
          if (newMessages[lastIndex]?.sender === 'bot' && newMessages[lastIndex]?.isLoading) {
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              text: errorMessage,
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
    <div className={styles.chatBox}>
      <div ref={chatBoxContentRef} className={styles.chatBoxContent}>
        {messages.map((message) => {
          const messageKey = message.id;
          const hasImages = message.imageEntries && message.imageEntries.length > 0;
          const imagesAlreadyAdded = imagesMessageAddedRef.current.has(messageKey);
          
          return (
            <div key={message.id} className={styles.chatBoxMessageContainer}>
              {/* Text message */}
              {!message.isImageMessage && (
                <div data-sender={message.sender} className={styles.chatBoxMessage}>
                  <p className={styles.chatBoxMessageText}>
                    {message.sender === 'bot' ? (
                      // Skip animation for loaded messages - show text immediately
                      message.isLoaded ? (
                        message.text
                      ) : (
                        <TypewriterMessage
                          text={message.text}
                          isLoading={message.isLoading}
                          onComplete={
                            hasImages && !imagesAlreadyAdded
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
                                      imageIds: message.imageIds,
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
                      message.text
                    )}
                  </p>
                </div>
              )}
              
              {/* Images message (rendered as separate message) */}
              {message.isImageMessage && message.imageEntries && (
                <ExploreArchiveLink
                  messageId={message.id}
                  imageIds={message.imageIds}
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
        <form onSubmit={handleSubmit} className={styles.chatBoxForm}>
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
        <div className={`${styles.chatBoxLine} ${styles.topLine}`} />
        <div className={`${styles.chatBoxLine} ${styles.bottomLine}`} />
        <div className={`${styles.chatBoxCircle} ${styles.topRightCircle}`} />
        <div className={`${styles.chatBoxCircle} ${styles.bottomRightCircle}`} />
        <div className={`${styles.chatBoxCircle} ${styles.bottomLeftCircle}`} />
        <div className={`${styles.chatBoxCircle} ${styles.topLeftCircle}`} />
      </div>
    </div>
  );
}
