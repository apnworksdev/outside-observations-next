'use client';

import { useEffect, useRef } from 'react';
import useTypewriter from '@app/_hooks/useTypewriter';

const DEFAULT_LOADING_FRAMES = ['.', '..', '...', ''];

export default function TypewriterMessage({
  text = '',
  isLoading = false,
  loadingFrames = DEFAULT_LOADING_FRAMES,
  typingSpeed = 20,
  loadingSpeed = 420,
  onComplete,
}) {
  const skipToEndRef = useRef(false);
  const clickHandlerRef = useRef(null);
  
  const typewriterText = useTypewriter(text, {
    typingSpeed,
    isLoading,
    loadingFrames,
    loadingSpeed,
    skipToEnd: skipToEndRef,
  });
  
  const prevLengthRef = useRef(0);
  const completedRef = useRef(false);

  // Handle click-to-skip: add listener when typing starts, remove when done
  useEffect(() => {
    const isTyping = !isLoading && text && typewriterText.length > 0 && typewriterText !== text;
    const isComplete = !isLoading && text && typewriterText === text;

    if (isTyping && !clickHandlerRef.current) {
      // Typing started - add click listener
      skipToEndRef.current = false;
      const handleClick = () => {
        skipToEndRef.current = true;
      };
      clickHandlerRef.current = handleClick;
      document.addEventListener('click', handleClick);
    } else if (isComplete && clickHandlerRef.current) {
      // Typing complete - remove click listener
      document.removeEventListener('click', clickHandlerRef.current);
      clickHandlerRef.current = null;
    }

    return () => {
      if (clickHandlerRef.current) {
        document.removeEventListener('click', clickHandlerRef.current);
        clickHandlerRef.current = null;
      }
    };
  }, [typewriterText, text, isLoading]);

  // Check if typing is complete and call onComplete
  useEffect(() => {
    if (!isLoading && text && typewriterText === text && !completedRef.current) {
      completedRef.current = true;
      if (onComplete) {
        onComplete();
      }
    }
    
    // Reset completed flag if text changes
    if (prevLengthRef.current !== text.length) {
      completedRef.current = false;
      prevLengthRef.current = text.length;
      skipToEndRef.current = false;
      // Clean up click listener when text changes
      if (clickHandlerRef.current) {
        document.removeEventListener('click', clickHandlerRef.current);
        clickHandlerRef.current = null;
      }
    }
  }, [typewriterText, text, isLoading, onComplete]);

  // Show message if loading, has text, or typewriter is active
  const shouldRender = isLoading || text || typewriterText.length > 0;

  if (!shouldRender) {
    return null;
  }

  return <>{typewriterText}</>;
}

