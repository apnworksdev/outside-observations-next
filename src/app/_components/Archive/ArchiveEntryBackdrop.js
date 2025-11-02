"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import styles from '@app/_assets/archive.module.css';

export default function ArchiveEntryBackdrop({ children }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleBackdropClick = () => {
    const view = searchParams?.get('view');
    const target = view ? `/archive?view=${view}` : '/archive';
    router.push(target);
  };

  const handleContentClick = (event) => {
    event.stopPropagation();
  };

  return (
    <div className={styles.archiveEntryBackdrop} onClick={handleBackdropClick} role="presentation">
      <div className={styles.archiveEntryBackdropContent} onClick={handleContentClick}>{children}</div>
    </div>
  );
}

