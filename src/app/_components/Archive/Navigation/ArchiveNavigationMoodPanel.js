'use client';

import { useCallback } from 'react';
import { useArchiveEntries } from '@/app/_components/Archive/ArchiveEntriesProvider';
import styles from '@app/_assets/archive/archive-navigation.module.css';

const MOOD_TAGS = [
  'Analyze',
  'Anger',
  'Anguish',
  'Anxious',
  'Artificial',
  'Contemplate',
  'Content',
  'Cooperative',
  'Delicate',
  'Determined',
  'Directed',
  'Discover',
  'Dramatic',
  'Dream',
  'Energetic',
  'Engaging',
  'Excited',
  'Fleeting',
  'Focused',
  'Friendly',
  'Gentle',
  'Grief',
  'Guarded',
  'Hectic',
  'Helpful',
  'Hopeful',
  'Innocent',
  'Intense',
  'Intentional',
  'Interpret',
  'Joyful',
  'Lively',
  'Lonely',
  'Loving',
  'Memory',
  'Mysterious',
  'Nostalgic',
  'Notice',
  'Nurturing',
  'Observe',
  'Oppression',
  'Passionate',
  'Peaceful',
  'Playful',
  'Present',
  'Protective',
  'Purposeful',
  'Question',
  'Quiet',
  'Resilient',
  'Restless',
  'Sad',
  'Searching',
  'Solitary',
  'Stable',
  'Still',
  'Strong',
  'Surreal',
  'Tender',
  'Transform',
  'Trusting',
  'Turmoil',
  'Unsettled',
  'Vulnerable',
  'Withdrawn',
];

export default function ArchiveNavigationMoodPanel() {
  const { selectedMoodTag, setMoodTag, clearMoodTag } = useArchiveEntries();

  const handleTagClick = useCallback(
    (tagName) => {
      if (selectedMoodTag === tagName) {
        clearMoodTag();
      } else {
        setMoodTag(tagName);
      }
    },
    [selectedMoodTag, setMoodTag, clearMoodTag]
  );

  return (
    <div className={styles.archiveNavigationMoodPanelContent}>
      <ul className={styles.archiveNavigationMoodPanelList}>
        {MOOD_TAGS.map((tag) => {
          const isSelected = selectedMoodTag === tag;
          return (
            <li key={tag}>
              <button
                type="button"
                onClick={() => handleTagClick(tag)}
                className={isSelected ? styles.archiveNavigationPanelTagActive : undefined}
                aria-pressed={isSelected ? 'true' : 'false'}
              >
                <span
                  className={`${styles.archiveNavigationPanelTagIndicator} ${
                    isSelected ? styles.archiveNavigationPanelTagIndicatorActive : ''
                  }`}
                />
                {tag}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}


