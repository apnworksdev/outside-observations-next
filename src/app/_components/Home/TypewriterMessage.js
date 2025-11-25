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
  const typewriterText = useTypewriter(text, {
    typingSpeed,
    isLoading,
    loadingFrames,
    loadingSpeed,
  });
  
  const prevLengthRef = useRef(0);
  const completedRef = useRef(false);

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
    }
  }, [typewriterText, text, isLoading, onComplete]);

  // Show message if loading, has text, or typewriter is active
  const shouldRender = isLoading || text || typewriterText.length > 0;

  if (!shouldRender) {
    return null;
  }

  return <>{typewriterText}</>;
}

