"use client";

import { usePathname } from 'next/navigation';
import { useArchiveEntriesSafe } from '@/app/_components/Archive/providers/ArchiveEntriesProvider';
import { useArchiveViewToggleState } from '@/app/_components/Archive/features/list/useArchiveViewToggleState';
import styles from '@app/_assets/layout/nav.module.css';

export default function ArchiveViewToggle({ className, initialExternalView = 'images' }) {
  const archiveContext = useArchiveEntriesSafe();
  const pathname = usePathname();
  const { currentView, hasActiveFilters, handleSetView, handleClearFilters } = useArchiveViewToggleState({
    archiveContext,
    initialExternalView,
    pathname,
  });

  return (
    <>
      <div className={className}>
        <p>View: </p>
        <button
          type="button"
          aria-pressed={currentView === 'images'}
          className={styles.archiveViewToggleButton}
          onClick={() => handleSetView('images')}
        >
          Images
        </button>
      <button
        type="button"
        aria-pressed={currentView === 'list'}
        className={styles.archiveViewToggleButton}
        onClick={() => handleSetView('list')}
      >
        List
      </button>
      </div>
      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleClearFilters}
          className={`${styles.archiveViewToggleButton} ${styles.navBubble}`}
        >
          Clear
        </button>
      )}
    </>
  );
}


