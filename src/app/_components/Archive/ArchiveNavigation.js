import styles from '@app/_assets/archive.module.css';

export default function ArchiveNavigation() {
  return (
    <div className={styles.archiveNavigation}>
      <button type="button" aria-label="Explore" className={`${styles.archiveNavigationButton} ${styles.archiveNavigationButtonExplore}`}></button>
      <button type="button" aria-label="Moods" className={`${styles.archiveNavigationButton} ${styles.archiveNavigationButtonMoods}`}></button>
      <button type="button" aria-label="Tags" className={`${styles.archiveNavigationButton} ${styles.archiveNavigationButtonTags}`}></button>
      <button type="button" aria-label="Sources" className={`${styles.archiveNavigationButton} ${styles.archiveNavigationButtonSources}`}></button>
      <button type="button" aria-label="Years" className={`${styles.archiveNavigationButton} ${styles.archiveNavigationButtonYears}`}></button>
      <p className={styles.archiveNavigationLabel}>
        Explore
      </p>
    </div>
  );
}