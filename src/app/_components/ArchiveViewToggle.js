"use client";

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import styles from '@app/_assets/nav.module.css';

export default function ArchiveViewToggle({ className }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentView = searchParams?.get('view') === 'images' ? 'images' : 'list';

  const setView = (view) => {
    const target = '/archive';
    const params = new URLSearchParams();
    params.set('view', view);
    router.replace(`${target}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className={className}>
      <p>View: </p>
      <button
        type="button"
        aria-pressed={pathname === '/archive' && currentView === 'list'}
        className={styles.archiveViewToggleButton}
        onClick={() => setView('list')}
      >
        List
      </button>
      <button
        type="button"
        aria-pressed={pathname === '/archive' && currentView === 'images'}
        className={styles.archiveViewToggleButton}
        onClick={() => setView('images')}
      >
        Images
      </button>
    </div>
  );
}


