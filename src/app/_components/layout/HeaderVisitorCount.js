'use client';

import { useEffect } from 'react';

import styles from '@app/_assets/layout/nav.module.css';
import { useVisitorCount } from '@/app/_components/shared/VisitorCountProvider';

export default function HeaderVisitorCount() {
  const { visitorCount, fetchVisitorCount } = useVisitorCount();

  useEffect(() => {
    if (visitorCount === null || visitorCount === undefined) {
      fetchVisitorCount();
    }
  }, [visitorCount, fetchVisitorCount]);

  const hasCount = typeof visitorCount === 'number';
  const label = hasCount
    ? `${visitorCount} active user${visitorCount === 1 ? '' : 's'}`
    : 'active users';

  return (
    <div className={styles.headerVisitorCount} aria-live="polite">
      <span className={styles.headerVisitorCountDot} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
