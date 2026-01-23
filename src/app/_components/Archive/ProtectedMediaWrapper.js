'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useContentWarningConsent } from '@/app/_contexts/ContentWarningConsentContext';
import { MediaProtector } from '@/app/_components/MediaProtector';
import styles from '@app/_assets/media-protector.module.css';

/**
 * ProtectedMediaWrapper - Only wraps media when contentWarning is true.
 * If contentWarning is false, just renders children normally.
 * 
 * Applies blur styling by default if contentWarning is true.
 * Removes blur when user has consented.
 */
export function ProtectedMediaWrapper({ contentWarning, className, children }) {
  const { hasConsent, isMounted } = useContentWarningConsent();
  const wrapperRef = useRef(null);
  const parentElementRef = useRef(null);
  
  // Apply blur by default if contentWarning is true (unless user has consented)
  // During SSR and before mount, we blur to be safe
  const shouldBlur = contentWarning && (!isMounted || !hasConsent);

  // Set up overflow: hidden when blur is needed
  useEffect(() => {
    if (!shouldBlur || typeof window === 'undefined') {
      return;
    }
    
    const hasClassName = !!className;
    
    // If we have a className, overflow is applied via CSS class immediately
    if (hasClassName) {
      return;
    }
    
    // If using display: contents, we need to add overflow to the parent
    const rafId = window.requestAnimationFrame(() => {
      try {
        const wrapperElement = wrapperRef.current;
        if (!wrapperElement) return;
        
        const parentElement = wrapperElement.parentElement;
        if (!parentElement) return;
        
        parentElementRef.current = parentElement;
        // Store original overflow for cleanup
        if (!parentElement.dataset.originalOverflow) {
          parentElement.dataset.originalOverflow = parentElement.style.overflow || '';
        }
        parentElement.style.overflow = 'hidden';
      } catch (error) {
        console.error('Error setting overflow:', error);
      }
    });
    
    return () => {
      window.cancelAnimationFrame(rafId);
      // Restore original overflow on cleanup
      if (parentElementRef.current?.dataset.originalOverflow !== undefined) {
        parentElementRef.current.style.overflow = parentElementRef.current.dataset.originalOverflow;
        delete parentElementRef.current.dataset.originalOverflow;
      }
      parentElementRef.current = null;
    };
  }, [shouldBlur, className]);

  const handleContextMenu = useCallback((e) => {
    if (shouldBlur) {
      e.preventDefault();
    }
  }, [shouldBlur]);

  // If no contentWarning, just render children normally
  if (!contentWarning) {
    return children;
  }

  const wrapperClassName = [
    className,
    shouldBlur ? styles.wrapperBlurred : '',
    shouldBlur && className ? styles.wrapperWithOverflow : '',
  ].filter(Boolean).join(' ') || undefined;
  const wrapperStyle = !className ? { display: 'contents' } : undefined;

  return (
    <div
      ref={wrapperRef}
      className={wrapperClassName}
      style={wrapperStyle}
      onContextMenu={handleContextMenu}
    >
      {children}
      <MediaProtector contentWarning={contentWarning} />
    </div>
  );
}
