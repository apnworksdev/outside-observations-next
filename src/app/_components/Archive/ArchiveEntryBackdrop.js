"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import styles from '@app/_assets/archive/archive-entry.module.css';

export default function ArchiveEntryBackdrop({ children, entry }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleBackdropClick = () => {
    const view = searchParams?.get('view');
    const target = view ? `/archive?view=${view}` : '/archive';
    router.push(target);
  };

  const handleContentClick = (event) => {
    // For visual essays, allow clicks on empty space in wrapper to pass through to backdrop
    const wrapper = event.target?.closest?.('[data-entry-type="visualEssay"]');
    if (wrapper) {
      // Check if click is on content (article, images, text) or empty space
      const clickedContent = event.target?.closest?.('article, img, picture, [class*="archiveEntryVisual"], h2, p');
      // If clicking on empty space, let it propagate to backdrop (navigate back)
      if (!clickedContent) {
        return;
      }
    }
    // Otherwise, stop propagation for content items
    event.stopPropagation();
  };

  return (
    <div 
      className={styles.archiveEntryBackdrop} 
      onClick={handleBackdropClick} 
      role="presentation"
    >
      <div className={styles.archiveEntryBackdropContent} onClick={handleContentClick}>{children}</div>
    </div>
  );
}

