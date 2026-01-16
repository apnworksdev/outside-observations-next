'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRadioIframe } from './RadioIframeProvider';
import styles from '@app/_assets/radio-iframe.module.css';

const RADIO_URL = 'https://www.outsideobservations.radio/';

/**
 * RadioIframe - Renders the radio iframe when open
 * 
 * This component should be placed in the root layout so it persists across navigation.
 * The iframe will remain mounted and visible as users navigate the site.
 */
export default function RadioIframe() {
  const { isOpen, isMinimized, closeRadio, toggleMinimize } = useRadioIframe();
  const [position, setPosition] = useState({ x: 50, y: 50 }); // Percentage values for centering
  const isDraggingRef = useRef(false);
  const initialPosRef = useRef({ x: 0, y: 0 }); // Initial position in pixels when drag starts
  const dragOffsetRef = useRef({ x: 0, y: 0 }); // Mouse offset from element center
  const dimensionsRef = useRef({ width: 0, height: 0 }); // Cached element dimensions
  const iframeRef = useRef(null);
  const iframeContentRef = useRef(null);
  const rafIdRef = useRef(null);

  // Reset position when radio is closed
  useEffect(() => {
    if (!isOpen && iframeRef.current) {
      setPosition({ x: 50, y: 50 });
      // Reset transform
      iframeRef.current.style.transform = 'translate(-50%, -50%)';
    }
  }, [isOpen]);

  // Reset position to center when window is resized
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      if (iframeRef.current) {
        setPosition({ x: 50, y: 50 });
        iframeRef.current.style.transform = 'translate(-50%, -50%)';
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  // Cleanup: restore pointer events if component unmounts while dragging
  useEffect(() => {
    return () => {
      if (isDraggingRef.current) {
        document.body.style.pointerEvents = '';
        document.body.style.userSelect = '';
      }
    };
  }, []);

  const updatePosition = useCallback((clientX, clientY) => {
    if (!iframeRef.current) return;

    // Calculate new position in pixels (faster than percentage)
    const newX = clientX - dragOffsetRef.current.x;
    const newY = clientY - dragOffsetRef.current.y;
    
    // Use cached dimensions (avoid expensive getBoundingClientRect on every frame)
    const halfWidth = dimensionsRef.current.width / 2;
    const halfHeight = dimensionsRef.current.height / 2;
    
    // Clamp to keep window on screen
    const clampedX = Math.max(halfWidth, Math.min(window.innerWidth - halfWidth, newX));
    const clampedY = Math.max(halfHeight, Math.min(window.innerHeight - halfHeight, newY));
    
    // Detect which edges are being constrained
    const isAtTop = clampedY <= halfHeight;
    const isAtBottom = clampedY >= window.innerHeight - halfHeight;
    const isAtLeft = clampedX <= halfWidth;
    const isAtRight = clampedX >= window.innerWidth - halfWidth;
    
    // Apply/remove border classes based on edge constraints
    iframeRef.current.classList.toggle(styles.hitTop, isAtTop);
    iframeRef.current.classList.toggle(styles.hitBottom, isAtBottom);
    iframeRef.current.classList.toggle(styles.hitLeft, isAtLeft);
    iframeRef.current.classList.toggle(styles.hitRight, isAtRight);
    
    // Use transform for GPU acceleration (much faster than left/top)
    // Calculate offset from center position
    const offsetX = clampedX - initialPosRef.current.x;
    const offsetY = clampedY - initialPosRef.current.y;
    
    // Use transform with calc for GPU acceleration
    iframeRef.current.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
  }, []);

  const handleMove = useCallback((clientX, clientY) => {
    if (!isDraggingRef.current) return;
    
    // Use requestAnimationFrame for smooth updates
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    
    rafIdRef.current = requestAnimationFrame(() => {
      updatePosition(clientX, clientY);
    });
  }, [updatePosition]);

  const handleMouseMove = useCallback((e) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length > 0) {
      e.preventDefault(); // Prevent scrolling while dragging
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handleMove]);

  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    
    isDraggingRef.current = false;
    
    // Cancel any pending animation frame
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    
    // Update React state with final position for persistence
    // Only called once on drag end, so getBoundingClientRect is acceptable here
    if (iframeRef.current) {
      const rect = iframeRef.current.getBoundingClientRect();
      const centerX = rect.left + (rect.width / 2);
      const centerY = rect.top + (rect.height / 2);
      
      // Convert to percentage
      setPosition({
        x: (centerX / window.innerWidth) * 100,
        y: (centerY / window.innerHeight) * 100
      });
      
      // Reset transform to use percentage-based positioning
      iframeRef.current.style.transform = 'translate(-50%, -50%)';
    }
    
    // Remove event listeners
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleMouseUp);
    
    // Re-enable pointer events and user selection on body
    document.body.style.pointerEvents = '';
    document.body.style.userSelect = '';
    
    // Remove dragging class and edge border classes, reset pointer events
    if (iframeRef.current) {
      iframeRef.current.classList.remove(styles.radioIframeDragging);
      iframeRef.current.classList.remove(styles.hitTop, styles.hitBottom, styles.hitLeft, styles.hitRight);
      iframeRef.current.style.pointerEvents = '';
    }
    // Re-enable pointer events on iframe content
    if (iframeContentRef.current) {
      iframeContentRef.current.style.pointerEvents = '';
    }
  }, [handleMouseMove, handleTouchMove]);

  const handleStart = useCallback((clientX, clientY) => {
    if (!iframeRef.current) return;
    
    isDraggingRef.current = true;
    
    // Cache dimensions to avoid getBoundingClientRect on every frame
    const rect = iframeRef.current.getBoundingClientRect();
    dimensionsRef.current = { width: rect.width, height: rect.height };
    
    const centerX = rect.left + (rect.width / 2);
    const centerY = rect.top + (rect.height / 2);
    
    // Store initial center position in pixels
    initialPosRef.current = { x: centerX, y: centerY };
    
    // Store pointer offset from element center
    dragOffsetRef.current = {
      x: clientX - centerX,
      y: clientY - centerY
    };
    
    // Add dragging class
    iframeRef.current.classList.add(styles.radioIframeDragging);
    
    // Disable pointer events and user selection on body to prevent hover effects and text selection
    document.body.style.pointerEvents = 'none';
    document.body.style.userSelect = 'none';
    // Re-enable pointer events on the iframe container (for buttons)
    iframeRef.current.style.pointerEvents = 'auto';
    // Disable pointer events on iframe content to prevent it from capturing pointer events
    if (iframeContentRef.current) {
      iframeContentRef.current.style.pointerEvents = 'none';
    }
    
    // Add event listeners for both mouse and touch
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);
  }, [handleMouseMove, handleMouseUp, handleTouchMove]);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return; // Only handle left mouse button
    
    e.preventDefault();
    e.stopPropagation();
    
    handleStart(e.clientX, e.clientY);
  }, [handleStart]);

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 0) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    handleStart(e.touches[0].clientX, e.touches[0].clientY);
  }, [handleStart]);

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      ref={iframeRef}
      data-radio-iframe="true" 
      className={`${styles.radioIframe} ${isMinimized ? styles.radioIframeMinimized : ''}`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className={styles.radioIframeHeader}>
        <button
          type="button"
          className={styles.dragHandle}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          aria-label="Drag window"
        >
          <div className={styles.dragHandleDots}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.dragHandleDot} />
            ))}
          </div>
        </button>
        <button 
          onClick={toggleMinimize} 
          className={`${styles.radioButton} ${styles.minimizeButton}`}
          aria-label={isMinimized ? 'Expand radio' : 'Minimize radio'}
        ></button>
        <button 
          onClick={closeRadio} 
          className={`${styles.radioButton} ${styles.closeButton}`}
          aria-label="Close radio"
        ></button>
      </div>
      <div ref={iframeContentRef} className={styles.radioIframeContent}>
        <iframe
          src={RADIO_URL}
          title="Outside Observations Radio"
          allow="autoplay"
          allowFullScreen
          style={{
            border: 'none',
          }}
        />
      </div>
    </div>
  );
}
