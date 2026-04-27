'use client';

import { createContext, useContext, useState, useCallback } from 'react';

const RadioIframeContext = createContext(null);

/**
 * RadioIframeProvider - Manages radio iframe open/close state
 * 
 * This provider allows components to control the radio iframe:
 * - HeaderNav can open the iframe when Radio link is clicked
 * - RadioIframe component renders the iframe when open
 * - State persists across navigation since provider is in root layout
 */
export function RadioIframeProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  /**
   * Open the radio iframe
   */
  const openRadio = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false); // Expand when opening
  }, []);

  /**
   * Close the radio iframe
   */
  const closeRadio = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false); // Reset minimized state when closing
  }, []);

  /**
   * Toggle the radio iframe
   */
  const toggleRadio = useCallback(() => {
    setIsOpen((prev) => !prev);
    setIsMinimized(false); // Reset minimized state when toggling
  }, []);

  /**
   * Minimize the radio iframe
   */
  const minimizeRadio = useCallback(() => {
    setIsMinimized(true);
  }, []);

  /**
   * Expand the radio iframe (restore from minimized)
   */
  const expandRadio = useCallback(() => {
    setIsMinimized(false);
  }, []);

  /**
   * Toggle minimized state
   */
  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  const value = {
    isOpen,
    isMinimized,
    openRadio,
    closeRadio,
    toggleRadio,
    minimizeRadio,
    expandRadio,
    toggleMinimize,
  };

  return (
    <RadioIframeContext.Provider value={value}>
      {children}
    </RadioIframeContext.Provider>
  );
}

/**
 * Hook to access radio iframe state
 * Returns no-op functions if not within provider (graceful degradation)
 */
export function useRadioIframe() {
  const context = useContext(RadioIframeContext);
  if (!context) {
    return {
      isOpen: false,
      isMinimized: false,
      openRadio: () => {},
      closeRadio: () => {},
      toggleRadio: () => {},
      minimizeRadio: () => {},
      expandRadio: () => {},
      toggleMinimize: () => {},
    };
  }
  return context;
}
