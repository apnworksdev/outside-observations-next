"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

import {
  VIEW_CHANGE_EVENT,
  VIEW_COOKIE_NAME,
  setArchiveViewPreference,
  useArchiveEntriesSafe,
} from '@/app/_components/Archive/ArchiveEntriesProvider';
import styles from '@app/_assets/nav.module.css';

function readViewCookie() {
  if (typeof document === 'undefined') {
    return 'list';
  }

  const cookieEntry = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${VIEW_COOKIE_NAME}=`));

  if (!cookieEntry) {
    return 'list';
  }

  const [, value = ''] = cookieEntry.split('=');
  const decoded = decodeURIComponent(value);
  return decoded === 'images' || decoded === 'list' ? decoded : 'list';
}

export default function ArchiveViewToggle({ className, initialExternalView = 'list' }) {
  const archiveContext = useArchiveEntriesSafe();
  const [externalView, setExternalView] = useState(initialExternalView);
  const isomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

  /**
   * The toggle is used both inside and outside the archive provider. When we don’t have
   * context we fall back to cookies + global events, keeping the toggle in sync with
   * whatever the archive sets. Inside the provider we defer to the shared state instead.
   */
  isomorphicLayoutEffect(() => {
    if (archiveContext) {
      return;
    }

    setExternalView(readViewCookie());
  }, [archiveContext]);

  useEffect(() => {
    if (archiveContext) {
      return undefined;
    }

    const handleExternalChange = (event) => {
      const nextView = event?.detail?.view;
      if (nextView === 'images' || nextView === 'list') {
        setExternalView(nextView);
      }
    };

    window.addEventListener(VIEW_CHANGE_EVENT, handleExternalChange);
    return () => {
      window.removeEventListener(VIEW_CHANGE_EVENT, handleExternalChange);
    };
  }, [archiveContext]);

  const currentView = archiveContext?.view ?? externalView;

  /**
   * Clicking a button either dispatches through the provider (if available) or updates
   * the cookie + global event directly. Invalid values are ignored, and redundant clicks
   * short-circuit to avoid extra work.
   */
  const handleSetView = useCallback(
    (nextView) => {
      if (nextView !== 'images' && nextView !== 'list') {
        return;
      }

      if (archiveContext?.setView) {
        archiveContext.setView(nextView);
      } else {
        setArchiveViewPreference(nextView);
        setExternalView(nextView);
      }
    },
    [archiveContext]
  );

  return (
    <div className={className}>
      <p>View: </p>
      <button
        type="button"
        aria-pressed={currentView === 'list'}
        className={styles.archiveViewToggleButton}
        onClick={() => handleSetView('list')}
      >
        List
      </button>
      <button
        type="button"
        aria-pressed={currentView === 'images'}
        className={styles.archiveViewToggleButton}
        onClick={() => handleSetView('images')}
      >
        Images
      </button>
    </div>
  );
}


