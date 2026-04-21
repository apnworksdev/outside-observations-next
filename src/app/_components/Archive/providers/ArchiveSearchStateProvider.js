'use client';

import { createContext, useContext, useState, useCallback } from 'react';

const ArchiveSearchStateContext = createContext(null);

/**
 * ArchiveSearchStateProvider - Lightweight provider for archive search state
 * Only manages search payload state, no data fetching
 * Available globally so ChatBox can set search state from any page
 */
export function ArchiveSearchStateProvider({ children }) {
  const [searchPayload, setSearchPayloadState] = useState(null);

  /**
   * Set search payload - can be called from anywhere (e.g., ChatBox)
   * The ArchiveEntriesProvider will consume this and apply it
   */
  const setSearchPayload = useCallback((payload) => {
    setSearchPayloadState(payload);
  }, []);

  /**
   * Clear search payload
   */
  const clearSearchPayload = useCallback(() => {
    setSearchPayloadState(null);
  }, []);

  /**
   * Get and consume search payload (used by ArchiveEntriesProvider)
   * Returns the payload and clears it in one operation
   */
  const consumeSearchPayload = useCallback(() => {
    const payload = searchPayload;
    if (payload) {
      setSearchPayloadState(null);
    }
    return payload;
  }, [searchPayload]);

  const value = {
    searchPayload,
    setSearchPayload,
    clearSearchPayload,
    consumeSearchPayload,
  };

  return (
    <ArchiveSearchStateContext.Provider value={value}>
      {children}
    </ArchiveSearchStateContext.Provider>
  );
}

/**
 * Hook to access archive search state
 * Returns null if not within provider (graceful degradation)
 */
export function useArchiveSearchState() {
  const context = useContext(ArchiveSearchStateContext);
  if (!context) {
    // Return no-op functions if context is not available
    return {
      searchPayload: null,
      setSearchPayload: () => {},
      clearSearchPayload: () => {},
      consumeSearchPayload: () => null,
    };
  }
  return context;
}

