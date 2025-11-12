import styles from '@app/_assets/archive/archive-navigation.module.css';

export default function ArchiveNavigationMoodPanel() {
  return (
    <div className={styles.archiveNavigationPanelContent}>
      <h2 className={styles.archiveNavigationPanelTitle}>Browse by mood</h2>
      <div className={styles.archiveNavigationPanelBody}>
        <p>Explore the archive through emotional cues curated by the Outside team.</p>
        <ul className={styles.archiveNavigationPanelList}>
          <li>Memory</li>
          <li>Discovery</li>
          <li>Serendipity</li>
          <li>Connection</li>
        </ul>
      </div>
    </div>
  );
}


