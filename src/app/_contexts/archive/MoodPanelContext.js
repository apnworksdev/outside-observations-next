'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const MoodPanelContext = createContext(null);

export function MoodPanelProvider({ children }) {
  const [isMoodPanelOpen, setIsMoodPanelOpen] = useState(false);

  const openMoodPanel = useCallback(() => setIsMoodPanelOpen(true), []);
  const closeMoodPanel = useCallback(() => setIsMoodPanelOpen(false), []);
  const toggleMoodPanel = useCallback(() => setIsMoodPanelOpen((open) => !open), []);

  const value = useMemo(
    () => ({ isMoodPanelOpen, openMoodPanel, closeMoodPanel, toggleMoodPanel }),
    [isMoodPanelOpen, openMoodPanel, closeMoodPanel, toggleMoodPanel]
  );

  return <MoodPanelContext.Provider value={value}>{children}</MoodPanelContext.Provider>;
}

export function useMoodPanel() {
  const context = useContext(MoodPanelContext);

  if (!context) {
    return {
      isMoodPanelOpen: false,
      openMoodPanel: () => {},
      closeMoodPanel: () => {},
      toggleMoodPanel: () => {},
    };
  }

  return context;
}
