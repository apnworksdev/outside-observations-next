export const VISITOR_SESSION_STORAGE_KEY = 'visitor_session_id';
export const VISITOR_EVENT_GROUP_WINDOW_MS = 2000;

export function getOrCreateVisitorSessionId(currentSessionId) {
  if (currentSessionId) {
    return currentSessionId;
  }

  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem(VISITOR_SESSION_STORAGE_KEY);
    if (stored) {
      return stored;
    }
  }

  const newSessionId = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(VISITOR_SESSION_STORAGE_KEY, newSessionId);
  }
  return newSessionId;
}

export function collectNewVisitorEvents(events, lastTimestamp) {
  let foundNewEvent = false;
  let highestTimestamp = lastTimestamp;
  const newVisitorEvents = [];

  for (const event of events) {
    if (!event || typeof event.timestamp !== 'number') continue;

    if (event.timestamp > lastTimestamp) {
      highestTimestamp = Math.max(highestTimestamp, event.timestamp);
      foundNewEvent = true;
      if (event.type === 'visitor_joined') {
        newVisitorEvents.push(event);
      }
    }
  }

  return {
    foundNewEvent,
    highestTimestamp,
    newVisitorEvents,
  };
}

export function groupVisitorEventsByTimeWindow(events, windowMs = VISITOR_EVENT_GROUP_WINDOW_MS) {
  if (!Array.isArray(events) || events.length === 0) {
    return [];
  }

  const groupedEvents = [];
  let currentGroup = [events[0]];
  let groupStartTime = events[0].timestamp;

  for (let i = 1; i < events.length; i++) {
    const event = events[i];
    if (!event || typeof event.timestamp !== 'number') continue;

    if (Math.abs(groupStartTime - event.timestamp) <= windowMs) {
      currentGroup.push(event);
    } else {
      groupedEvents.push(currentGroup);
      currentGroup = [event];
      groupStartTime = event.timestamp;
    }
  }

  if (currentGroup.length > 0) {
    groupedEvents.push(currentGroup);
  }

  return groupedEvents;
}
