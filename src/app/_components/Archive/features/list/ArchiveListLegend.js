'use client';

import styles from '@app/_assets/archive/archive-page.module.css';

export default function ArchiveListLegend({ hasEntries, sortableLegendColumns, typeSort, onSortClick }) {
  return (
    <div
      className={styles.containerLegend}
      data-visible={hasEntries ? 'true' : 'false'}
      aria-hidden={hasEntries ? undefined : 'true'}
    >
      {sortableLegendColumns.map(({ key, label, sort }) => (
        <div key={key} className={styles.containerLegendColumn}>
          <button
            type="button"
            className={styles.containerLegendColumnButton}
            onClick={() => onSortClick(sort)}
            data-sort-state={sort.dataState}
            aria-label={sort.ariaLabel}
          >
            <span>{label}</span>
            <span aria-hidden="true" className={styles.containerLegendSortIndicator}>
              {sort.indicator}
            </span>
          </button>
        </div>
      ))}
      <div className={styles.containerLegendColumn}>
        <div className={styles.containerLegendColumnItem}>
          <p>Tags</p>
        </div>
      </div>
      <div className={styles.containerLegendColumn}>
        <div className={styles.containerLegendColumnItem}>
          <p>Mood Tags</p>
        </div>
      </div>
      <div className={styles.containerLegendColumn}>
        <button
          type="button"
          className={styles.containerLegendColumnButton}
          onClick={() => onSortClick(typeSort)}
          data-sort-state={typeSort.dataState}
          aria-label={typeSort.ariaLabel}
        >
          <span>Type</span>
          <span aria-hidden="true" className={styles.containerLegendSortIndicator}>
            {typeSort.indicator}
          </span>
        </button>
      </div>
    </div>
  );
}
