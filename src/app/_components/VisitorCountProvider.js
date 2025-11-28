'use client';

import { createContext, useContext, useState, useCallback } from 'react';

const VisitorCountContext = createContext(null);

/**
 * VisitorCountProvider - Shared state for visitor count
 * 
 * This provider allows components to share the visitor count:
 * - VisitorTracker updates the count when heartbeats return new values
 * - ArchiveNavigation shows the count on hover for the live button
 * - Count updates automatically when heartbeats detect changes
 */
export function VisitorCountProvider({ children }) {
  const [visitorCount, setVisitorCount] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [notifications, setNotifications] = useState([]);

  /**
   * Update visitor count - called by VisitorTracker when heartbeat/register returns count
   */
  const updateVisitorCount = useCallback((count) => {
    // Validate count is a valid number (including 0)
    if (count !== null && count !== undefined && typeof count === 'number' && count >= 0) {
      setVisitorCount(count);
      setLastUpdated(Date.now());
    }
  }, []);

  /**
   * Fetch visitor count on-demand (lazy loading)
   * Used when user hovers over the button to get fresh count
   */
  const fetchVisitorCount = useCallback(async () => {
    try {
      const response = await fetch('/api/visitors');
      if (response.ok) {
        const data = await response.json();
        // Ensure count is a valid number (not undefined or null)
        if (data.count !== undefined && data.count !== null && typeof data.count === 'number') {
          setVisitorCount(data.count);
          setLastUpdated(Date.now());
        }
      }
    } catch (error) {
      // Silently handle errors
    }
  }, []);

  /**
   * Add a notification - called when a visitor event is detected
   */
  const addNotification = useCallback((notification) => {
    setNotifications((prev) => {
      // Avoid duplicates
      const exists = prev.some((n) => n.timestamp === notification.timestamp);
      if (exists) return prev;
      return [notification, ...prev].slice(0, 5); // Keep only last 5 notifications
    });
  }, []);

  /**
   * Clear notifications
   */
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = {
    visitorCount,
    lastUpdated,
    updateVisitorCount,
    fetchVisitorCount,
    notifications,
    addNotification,
    clearNotifications,
  };

  return (
    <VisitorCountContext.Provider value={value}>
      {children}
    </VisitorCountContext.Provider>
  );
}

/**
 * Hook to access visitor count state
 * Returns null values if not within provider (graceful degradation)
 */
export function useVisitorCount() {
  const context = useContext(VisitorCountContext);
  if (!context) {
    return {
      visitorCount: null,
      lastUpdated: null,
      updateVisitorCount: () => {},
      fetchVisitorCount: async () => {},
      notifications: [],
      addNotification: () => {},
      clearNotifications: () => {},
    };
  }
  return context;
}

