'use client';

import { useCallback } from 'react';
import { useArchiveEntries } from '@/app/_components/Archive/ArchiveEntriesProvider';
import { trackMoodSelect } from '@/app/_helpers/gtag';
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
    children: ['Contemplative', 'Nostalgic', 'Dream-like', 'Surreal'],
  },
  {
    parent: 'Inquiry',
    children: ['Focused', 'Analytical'],
  },
  {
    parent: 'Melancholy',
    children: ['Mysterious', 'Solitary', 'Withdrawn', 'Searching'],
  },
  {
    parent: 'Processing',
    children: ['Artificial', 'Transformative'],
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
  const { selectedMoodTags, setMoodTag, setMoodTags } = useArchiveEntries();

  // Parent is "selected" when all its children are in the selection (filter = any of those children)
  const isParentSelected = useCallback(
    (children) => children.length > 0 && children.every((c) => selectedMoodTags.includes(c)),
    [selectedMoodTags]
  );

  const isParentOrChildSelected = useCallback(
    (parentTag, children) => isParentSelected(children) || children.some((c) => selectedMoodTags.includes(c)),
    [selectedMoodTags, isParentSelected]
  );

  const isChildSelected = useCallback(
    (childTag) => selectedMoodTags.includes(childTag),
    [selectedMoodTags]
  );

  const handleParentClick = useCallback(
    (parent, children) => {
      trackMoodSelect(parent);
      if (isParentSelected(children)) {
        // Deselect: remove all children of this parent
        setMoodTags(selectedMoodTags.filter((t) => !children.includes(t)));
      } else {
        // Select parent = select all children (entries only have child tags)
        const withoutThisGroup = selectedMoodTags.filter((t) => !children.includes(t));
        setMoodTags([...withoutThisGroup, ...children]);
      }
    },
    [selectedMoodTags, isParentSelected, setMoodTags]
  );

  const handleChildClick = useCallback(
    (child, children) => {
      trackMoodSelect(child);
      if (isParentSelected(children)) {
        // Parent was fully selected → narrow to only this child
        const withoutThisGroup = selectedMoodTags.filter((t) => !children.includes(t));
        setMoodTags([...withoutThisGroup, child]);
      } else {
        // Normal toggle of this child
        setMoodTag(child);
      }
    },
    [selectedMoodTags, isParentSelected, setMoodTag, setMoodTags]
  );

  return (
    <div className={styles.archiveNavigationMoodPanelContent}>
      <div className={styles.archiveNavigationMoodPanelContentWrapper}>
        {MOOD_TAGS.map(({ parent, children }) => {
          const parentSelected = isParentSelected(children);
          const groupSelected = isParentOrChildSelected(parent, children);

          return (
            <div
              key={parent}
              className={`${styles.archiveNavigationMoodPanelGroup} ${
                groupSelected ? styles.archiveNavigationMoodPanelGroupSelected : ''
              }`}
            >
              <button
                type="button"
                onClick={() => handleParentClick(parent, children)}
                className={`${styles.archiveNavigationMoodButton} ${
                  parentSelected ? styles.archiveNavigationPanelTagActive : ''
                }`}
                aria-pressed={parentSelected ? 'true' : 'false'}
              >
                {parent}
              </button>
              <ul className={styles.archiveNavigationMoodPanelGroupList}>
                {children.map((child) => {
                  const selected = isChildSelected(child);
                  // Only show child as active when it's selected and parent is not (narrowed/single selection)
                  const showChildActive = selected && !parentSelected;
                  return (
                    <li key={child} className={styles.archiveNavigationMoodPanelList}>
                      <button
                        type="button"
                        onClick={() => handleChildClick(child, children)}
                        className={`${styles.archiveNavigationMoodButton} ${
                          showChildActive ? styles.archiveNavigationPanelTagActive : ''
                        }`}
                        aria-pressed={showChildActive ? 'true' : 'false'}
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


