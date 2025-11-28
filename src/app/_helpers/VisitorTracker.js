'use client';

import { useEffect, useRef } from 'react';
import { useVisitorCount } from '@/app/_components/VisitorCountProvider';

/**
 * VisitorTracker - Tracks active visitors using Upstash Redis
 * 
 * This component:
 * 1. Generates a unique session ID on mount
 * 2. Registers the visitor with the API
 * 3. Sends heartbeat every 30 seconds to keep the session alive
 * 4. Updates shared visitor count state when heartbeats return new counts
 * 
 * The session expires after 5 minutes of inactivity (handled by Redis TTL)
 */
export default function VisitorTracker() {
  const sessionIdRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const eventPollIntervalRef = useRef(null);
  const isRegisteredRef = useRef(false);
  const lastEventTimestampRef = useRef(0);
  const isPollingRef = useRef(false);
  const cascadePollTimeoutRef = useRef(null);
  const eventPollBackoffRef = useRef(60000); // Start with 60s, increase if no events
  const { updateVisitorCount, addNotification } = useVisitorCount();

  // Generate a unique session ID
  const getSessionId = () => {
    if (sessionIdRef.current) {
      return sessionIdRef.current;
    }

    // Try to get existing session ID from sessionStorage
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('visitor_session_id');
      if (stored) {
        sessionIdRef.current = stored;
        return stored;
      }
    }

    // Generate new session ID
    const newSessionId = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionIdRef.current = newSessionId;

    // Store in sessionStorage so it persists across page navigations
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('visitor_session_id', newSessionId);
    }

    return newSessionId;
  };

  // Register visitor or send heartbeat
  // OPTIMIZATION: Added includeCount parameter - only fetch count when needed
  const updateVisitorStatus = async (action = 'register', includeCount = false) => {
    const sessionId = getSessionId();

    try {
      const response = await fetch('/api/visitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          action,
          includeCount, // Only fetch count when explicitly requested
        }),
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      
      // Only update count if it was requested and returned (saves Redis calls)
      // Ensure count is a valid number (not undefined or null)
      if (includeCount && data.count !== undefined && data.count !== null && typeof data.count === 'number') {
        updateVisitorCount(data.count);
      }
      
      if (action === 'register') {
        isRegisteredRef.current = true;
        // Set lastEventTimestamp to current time to avoid showing old events
        lastEventTimestampRef.current = Date.now();
        // Poll for events immediately after registration
        // This ensures we catch events that happened just before we registered
        setTimeout(() => pollEvents(), 1000); // Small delay to ensure event is stored
      }
    } catch (error) {
      // Silently handle errors
    }
  };

  // Poll for visitor events (new visitors joining)
  // This runs independently of heartbeats to check for notifications
  const pollEvents = async () => {
    // Safety check: ensure document exists (SSR safety)
    if (typeof document === 'undefined' || document.hidden) return;
    if (isPollingRef.current) return; // Prevent overlapping polls

    isPollingRef.current = true;

    try {
      const response = await fetch('/api/visitors/events');
      if (response.ok) {
        const data = await response.json();
        const events = data.events || [];

        // Process events in order (they're already sorted newest first)
        // Aggregate multiple visitor_joined events within a short time window
        // Update lastEventTimestamp to the highest timestamp we've seen
        let foundNewEvent = false;
        let highestTimestamp = lastEventTimestampRef.current;
        const newVisitorEvents = [];

        // Collect all new visitor_joined events
        for (const event of events) {
          // Validate event has required fields
          if (!event || typeof event.timestamp !== 'number') continue;
          
          if (event.timestamp > lastEventTimestampRef.current) {
            highestTimestamp = Math.max(highestTimestamp, event.timestamp);
            foundNewEvent = true;

            if (event.type === 'visitor_joined') {
              newVisitorEvents.push(event);
            }
          }
        }

        // Aggregate visitor events that happened within 2 seconds of each other
        if (newVisitorEvents.length > 0) {
          // Group events by time windows (events within 2 seconds are grouped together)
          const groupedEvents = [];
          let currentGroup = [newVisitorEvents[0]];
          let groupStartTime = newVisitorEvents[0].timestamp;

          for (let i = 1; i < newVisitorEvents.length; i++) {
            const event = newVisitorEvents[i];
            // Validate event has valid timestamp
            if (!event || typeof event.timestamp !== 'number') continue;
            
            // If event is within 2 seconds of the group start, add to current group
            // Use Math.abs to handle any timestamp ordering issues
            if (Math.abs(groupStartTime - event.timestamp) <= 2000) {
              currentGroup.push(event);
            } else {
              // Start a new group
              groupedEvents.push(currentGroup);
              currentGroup = [event];
              groupStartTime = event.timestamp;
            }
          }
          // Don't forget the last group
          if (currentGroup.length > 0) {
            groupedEvents.push(currentGroup);
          }

          // Create notifications for each group
          for (const group of groupedEvents) {
            if (group.length === 0) continue; // Skip empty groups
            
            const count = group.length;
            const latestEvent = group[0]; // Use the newest event's timestamp and count
            
            // Validate event has required fields
            if (!latestEvent || typeof latestEvent.timestamp !== 'number') continue;
            
            const message = count === 1 ? '+1 user' : `+${count} users`;
            
            addNotification({
              type: 'visitor_joined',
              message,
              count: latestEvent.count || count, // Fallback to group length if count is missing
              timestamp: latestEvent.timestamp,
            });
          }
        }

        // Update to the highest timestamp we've seen
        if (foundNewEvent) {
          lastEventTimestampRef.current = highestTimestamp;
          // Reset backoff when we find events (events are happening, poll more frequently)
          eventPollBackoffRef.current = 60000; // Reset to 60s

          // Clear any existing cascade poll timeout
          if (cascadePollTimeoutRef.current) {
            clearTimeout(cascadePollTimeoutRef.current);
          }

          // Poll again soon to catch any events that might have been created
          // while we were processing (race condition protection)
          cascadePollTimeoutRef.current = setTimeout(() => {
            pollEvents();
          }, 2000);
        } else {
          // OPTIMIZATION: Exponential backoff when no events found
          // Increase polling interval if no events (up to 5 minutes max)
          eventPollBackoffRef.current = Math.min(eventPollBackoffRef.current * 1.5, 300000);
        }
      }
    } catch (err) {
      // Silently handle errors
    } finally {
      isPollingRef.current = false;
    }
  };

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    // Register visitor on mount (with count for initial display)
    updateVisitorStatus('register', true);

    // Set up heartbeat interval (every 120 seconds / 2 minutes)
    // OPTIMIZATION: Increased to 120s - precision not critical, saves 50% more calls
    // Only send heartbeat if page is visible (saves resources when tab is hidden)
    // OPTIMIZATION: Don't fetch count on heartbeat (only when needed)
    heartbeatIntervalRef.current = setInterval(() => {
      if (isRegisteredRef.current && typeof document !== 'undefined' && !document.hidden) {
        updateVisitorStatus('heartbeat', false); // Don't fetch count
        // Poll events after heartbeat (but less frequently)
        setTimeout(() => pollEvents(), 500);
      }
    }, 120000); // 120 seconds (2 minutes) - precision not critical

    // Poll for events with adaptive backoff (starts at 60s, increases if no events)
    // OPTIMIZATION: Uses exponential backoff - polls less when no activity
    const scheduleNextEventPoll = () => {
      if (eventPollIntervalRef.current) {
        clearTimeout(eventPollIntervalRef.current);
      }
      eventPollIntervalRef.current = setTimeout(() => {
        if (typeof document !== 'undefined' && !document.hidden && isRegisteredRef.current) {
          pollEvents();
          scheduleNextEventPoll(); // Schedule next poll with current backoff
        } else {
          // If document is hidden or not registered, reschedule anyway
          scheduleNextEventPoll();
        }
      }, eventPollBackoffRef.current);
    };
    
    // Start adaptive polling
    scheduleNextEventPoll();

    // Initial event poll after a short delay (to avoid showing old events)
    // Set lastEventTimestamp to current time so we only show new events
    lastEventTimestampRef.current = Date.now();
    setTimeout(() => pollEvents(), 1000); // Poll after 1 second

    // Handle page visibility changes
    // When page becomes visible again, send a heartbeat and poll events immediately
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden && isRegisteredRef.current) {
        updateVisitorStatus('heartbeat', false); // Don't fetch count
        pollEvents();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // Cleanup on unmount
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (eventPollIntervalRef.current) {
        clearTimeout(eventPollIntervalRef.current);
      }
      if (cascadePollTimeoutRef.current) {
        clearTimeout(cascadePollTimeoutRef.current);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // updateVisitorStatus is stable (uses refs), so we can safely ignore the warning

  // This component doesn't render anything
  return null;
}

