'use client';

import { useEffect, useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import styles from '@app/_assets/archive/archive-navigation.module.css';

const STORAGE_KEY = 'archiveNavigationReminderDismissed';
const SHOW_DELAY_MS = 2500;

function readDismissed() {
  if (typeof sessionStorage === 'undefined') return true;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeDismissed() {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // ignore
  }
}

/**
 * Call this when the user opens the archive navigation so the reminder
 * won’t show again this session.
 */
export function markArchiveNavigationUsed() {
  writeDismissed();
}

/**
 * Popup that reminds the user they can use the archive navigation.
 * Hides and persists in sessionStorage when:
 * - User has already opened the archive navigation this session, or
 * - User dismisses the popup (click the reminder, or hover/click the archive nav).
 * Does not show on archive entry pages (when navigation is hidden).
 */
const ArchiveNavigationReminder = forwardRef(function ArchiveNavigationReminder(
  { isNavigationOpen, isHidden, onVisibilityChange },
  ref
) {
  const [show, setShow] = useState(false);
  const visibilityRef = useRef({ isHidden, isNavigationOpen });
  visibilityRef.current = { isHidden, isNavigationOpen };

  useEffect(() => {
    onVisibilityChange?.(show);
  }, [show, onVisibilityChange]);

  const hide = useCallback(() => {
    writeDismissed();
    setShow(false);
  }, []);

  useImperativeHandle(ref, () => ({ dismiss: hide }), [hide]);

  // Show after delay unless already dismissed or nav used this session.
  // No "run once" guard so React Strict Mode's double effect run still leaves a timer scheduled.
  useEffect(() => {
    if (readDismissed()) return;

    const timer = setTimeout(() => {
      if (readDismissed()) return;
      const { isHidden: hidden, isNavigationOpen: navOpen } = visibilityRef.current;
      if (hidden || navOpen) return;
      setShow(true);
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  // Hide while nav is open or when we're on an entry page
  useEffect(() => {
    if (isNavigationOpen || isHidden) {
      setShow(false);
    }
  }, [isNavigationOpen, isHidden]);

  const dialogRef = useRef(null);

  // Focus the dialog when it appears for screen-reader users
  useEffect(() => {
    if (show && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [show]);

  // Don’t render at all if not showing
  if (!show || isHidden || isNavigationOpen) {
    return null;
  }

  return (
    <div
      ref={dialogRef}
      className={styles.archiveNavigationReminder}
      role="dialog"
      aria-labelledby="archive-navigation-reminder-title"
      aria-describedby="archive-navigation-reminder-desc"
      data-archive-reminder
      onClick={hide}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          hide();
        }
      }}
      tabIndex={0}
    >
      <p id="archive-navigation-reminder-title" className={styles.archiveNavigationReminderTitle}>
        Explore the archive
      </p>
      <p id="archive-navigation-reminder-desc" className={styles.archiveNavigationReminderDesc}>
        Use the menu in the bottom-right corner to browse by mood, chat, and more.
      </p>
    </div>
  );
});

export default ArchiveNavigationReminder;
