'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { urlForImage, sanityImageLoader } from '@/sanity/lib/image';
import { useArchiveEntriesSafe } from '@/app/_components/Archive/ArchiveEntriesProvider';
import styles from '@app/_assets/home.module.css';
import TypewriterMessage from './TypewriterMessage';

export default function ChatBox() {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [navigatingMessageId, setNavigatingMessageId] = useState(null);
  const textareaRef = useRef(null);
  const imagesMessageAddedRef = useRef(new Set());
  const router = useRouter();
  
  // Get archive entries from context
  const archiveContext = useArchiveEntriesSafe();
  
  // Get setSearchFromPayload function from context (to set search without API call)
  const setSearchFromPayload = archiveContext?.setSearchFromPayload;
  
  // Create a Map for fast lookup by _id (using baseId for duplicates)
  const entriesMap = useMemo(() => {
    const entries = archiveContext?.entries || [];
    const map = new Map();
    entries.forEach((entry) => {
      const id = entry?.baseId || entry?._id;
      if (id) {
        // Store the first entry we find for each baseId
        if (!map.has(id)) {
          map.set(id, entry);
        }
      }
    });
    return map;
  }, [archiveContext?.entries]);

  const messageIdRef = useRef(0);
  
  const [messages, setMessages] = useState([
    {
      id: messageIdRef.current++,
      text: 'Welcome to Outside Observations®, how can I help you?',
      sender: 'bot',
      isLoading: false
    }
  ]);


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
    if (!imageIds || imageIds.length === 0 || !searchQuery || !setSearchFromPayload) return;

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

    // Use setSearchFromPayload to apply search without API call
    setSearchFromPayload(payload);
  };

  // Reset loading state when component unmounts or route changes
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
        
        // Check if response has images and match them with archive entries
        const imageIds = Array.isArray(result?.images) && result.images.length > 0 
          ? result.images.filter((id) => typeof id === 'string' && id.trim().length > 0)
          : [];

        // Match image IDs with archive entries
        const matchedEntries = imageIds
          .map((id) => entriesMap.get(id))
          .filter(Boolean)
          .filter((entry) => entry?.poster?.asset?._ref); // Only entries with posters

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
        // Replace loading message with error message
        setMessages((prevMessages) => {
          const newMessages = [...prevMessages];
          const lastIndex = newMessages.length - 1;
          if (newMessages[lastIndex]?.sender === 'bot' && newMessages[lastIndex]?.isLoading) {
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              text: error.message || 'Sorry, I encountered an error. Please try again.',
              isLoading: false
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
      <div className={styles.chatBoxContent}>
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
                    ) : (
                      message.text
                    )}
                  </p>
                </div>
              )}
              
              {/* Images message (rendered as separate message) */}
              {message.isImageMessage && message.imageEntries && (
                <Link
                  href="/archive"
                  prefetch={true}
                  onClick={(e) => {
                    e.preventDefault();
                    if (message.imageIds && message.searchQuery) {
                      triggerArchiveSearch(message.id, message.imageIds, message.searchQuery);
                    }
                  }}
                  className={`${styles.chatBoxMessage} ${styles.chatBoxImagesMessage} ${navigatingMessageId === message.id ? styles.chatBoxImagesMessageLoading : ''}`}
                  data-sender="bot"
                  aria-label={`Explore ${message.imageEntries.length} archive entries`}
                  aria-busy={navigatingMessageId === message.id}
                >
                  <div className={styles.chatBoxImagesMessageImages}>
                    {message.imageEntries.slice(0, 4).map((entry) => {
                      const imageWidth = 300;
                      const imageHeight = entry?.poster?.dimensions?.aspectRatio
                        ? Math.round(imageWidth / entry.poster.dimensions.aspectRatio)
                        : imageWidth;
                      const imageUrl = urlForImage(entry.poster);

                      if (!imageUrl) return null;

                      return (
                        <div key={entry._id} className={styles.chatBoxImageContainer}>
                          <Image
                            loader={sanityImageLoader}
                            src={imageUrl}
                            alt={entry.artName || 'Archive entry poster'}
                            width={imageWidth}
                            height={imageHeight}
                            className={styles.chatBoxImage}
                            loading="lazy"
                            placeholder={entry?.poster?.lqip ? 'blur' : undefined}
                            blurDataURL={entry?.poster?.lqip || undefined}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className={styles.chatBoxImagesMessageFooter}>
                    <p className={styles.chatBoxImagesMessageFooterText}>
                      Explore...
                    </p>
                    <p className={styles.chatBoxImagesMessageFooterText}>
                      {message.imageEntries.length}
                    </p>
                  </div>
                </Link>
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
        <div className={`${styles.chatBoxCircle} ${styles.topRightCircle}`} />
        <div className={`${styles.chatBoxCircle} ${styles.bottomRightCircle}`} />
        <div className={`${styles.chatBoxCircle} ${styles.bottomLeftCircle}`} />
        <div className={`${styles.chatBoxCircle} ${styles.topLeftCircle}`} />
      </div>
    </div>
  );
}
