'use client';

import styles from '@app/_assets/archive/archive-navigation.module.css';
import { useMoodPanel } from '@/app/_contexts/archive/MoodPanelContext';
import ArchiveNavigationMoodPanel from './ArchiveNavigationMoodPanel';

export default function MoodPanelHost() {
  const { isMoodPanelOpen, closeMoodPanel } = useMoodPanel();

  if (!isMoodPanelOpen) {
    return null;
  }

  return (
    <div className={styles.moodPanelHost} data-open="true">
      <div className={styles.moodPanelHostHeader}>
        <button
          type="button"
          className={styles.moodPanelHostClose}
          onClick={closeMoodPanel}
          aria-label="Close moodboard visualizer"
        >
          X
        </button>
      </div>
      <ArchiveNavigationMoodPanel />
    </div>
  );
}
