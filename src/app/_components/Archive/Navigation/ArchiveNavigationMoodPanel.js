'use client';

import { useCallback } from 'react';
import { useArchiveEntries } from '@/app/_components/Archive/ArchiveEntriesProvider';
import styles from '@app/_assets/archive/archive-navigation.module.css';

const MOOD_TAGS = [
  {
    parent: 'Calm',
    children: ['Quiet', 'Gentle', 'Peaceful'],
  },
  {
    parent: 'Care',
    children: ['Protective'],
  },
  {
    parent: 'Enigmatic',
    children: ['Contemplate', 'Nostalgic', 'Dream', 'Surreal'],
  },
  {
    parent: 'Inquiry',
    children: ['Focused', 'Analyze'],
  },
  {
    parent: 'Melancholy',
    children: ['Mysterious', 'Solitary', 'Withdrawn', 'Searching'],
  },
  {
    parent: 'Processing',
    children: ['Artificial', 'Transform'],
  },
  {
    parent: 'Strength',
    children: ['Determined', 'Resilient'],
  },
  {
    parent: 'Social',
    children: ['Cooperative'],
  },
  {
    parent: 'Temperament',
    children: ['Passionate', 'Intense', 'Dramatic', 'Hectic'],
  },
  {
    parent: 'Uneasy',
    children: ['Turmoil', 'Guarded', 'Unsettled'],
  },
  {
    parent: 'Uplifted',
    children: ['Joyful', 'Playful', 'Lively'],
  },
  {
    parent: 'Vulnerable',
    children: ['Innocent', 'Tender'],
  },
];

export default function ArchiveNavigationMoodPanel() {
  const { selectedMoodTags, setMoodTag } = useArchiveEntries();

  const handleTagClick = useCallback(
    (tagName) => {
      setMoodTag(tagName);
    },
    [setMoodTag]
  );

  const isParentOrChildSelected = (parentTag, children) => {
    if (selectedMoodTags.includes(parentTag)) return true;
    return children.some((child) => selectedMoodTags.includes(child));
  };

  const isParentSelected = (parentTag) => {
    return selectedMoodTags.includes(parentTag);
  };

  const isChildSelected = (childTag) => {
    return selectedMoodTags.includes(childTag);
  };

  return (
    <div className={styles.archiveNavigationMoodPanelContent}>
      <div className={styles.archiveNavigationMoodPanelContentWrapper}>
        {MOOD_TAGS.map(({ parent, children }) => {
          const isParentTagSelected = isParentSelected(parent);
          const isGroupSelected = isParentOrChildSelected(parent, children);

          return (
            <div
              key={parent}
              className={`${styles.archiveNavigationMoodPanelGroup} ${
                isGroupSelected ? styles.archiveNavigationMoodPanelGroupSelected : ''
              }`}
            >
              <button
                type="button"
                onClick={() => handleTagClick(parent)}
                className={`${styles.archiveNavigationMoodButton} ${
                  isParentTagSelected ? styles.archiveNavigationPanelTagActive : ''
                }`}
                aria-pressed={isParentTagSelected ? 'true' : 'false'}
              >
                {parent}
              </button>
              <ul className={styles.archiveNavigationMoodPanelGroupList}>
                {children.map((child) => {
                  const isSelected = isChildSelected(child);
                  return (
                    <li key={child} className={styles.archiveNavigationMoodPanelList}>
                      <button
                        type="button"
                        onClick={() => handleTagClick(child)}
                        className={`${styles.archiveNavigationMoodButton} ${
                          isSelected ? styles.archiveNavigationPanelTagActive : ''}`}
                        aria-pressed={isSelected ? 'true' : 'false'}
                      >
                        {child}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}


