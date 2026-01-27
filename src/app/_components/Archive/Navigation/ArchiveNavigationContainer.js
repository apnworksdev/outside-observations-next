'use client';

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import styles from '@app/_assets/archive/archive-navigation.module.css';
import { ErrorBoundary } from '@/app/_components/ErrorBoundary';
import ArchiveNavigation from './ArchiveNavigation';
import ArchiveNavigationMoodPanel from './ArchiveNavigationMoodPanel';
import ArchiveNavigationChatPanel from './ArchiveNavigationChatPanel';
import VisitorNotificationToast from '@/app/_components/VisitorNotificationToast';
import ArchiveNavigationReminder, { markArchiveNavigationUsed } from './ArchiveNavigationReminder';
import { useVisitorCount } from '@/app/_components/VisitorCountProvider';
import { trackMenuOpen, trackMenuClose, trackMenuItemClick, trackChatPanelOpen } from '@/app/_helpers/gtag';

const NAVIGATION_ITEMS = [
  {
    id: 'chat',
    label: 'Chat',
    className: styles.archiveNavigationButtonSearch,
    href: null,
  },
  {
    id: 'mood',
    label: 'Mood',
    className: styles.archiveNavigationButtonMood,
    href: null,
  },
  {
    id: 'unexpected',
    label: 'Unexpected connections',
    className: styles.archiveNavigationButtonUnexpected,
    href: '/archive/unexpected-connections',
  },
  {
    id: 'live',
    label: 'Users researching',
    className: styles.archiveNavigationButtonLive,
    href: null,
  },
];

export default function ArchiveNavigationContainer() {
  /**
   * This container owns the state machine for the floating navigation control:
   *   - `isNavigationOpen` tracks the radial menu.
   *   - `activeItemId` decides which button (if any) owns the detail panel.
   *   - `panelId` mirrors the rendered panel for accessibility wiring.
   * We keep the router and pathname handy so interactions can deep-link and so the
   * navigation hides itself on entry detail pages.
   */
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [activeItemId, setActiveItemId] = useState(null);
  const [panelId, setPanelId] = useState(null);
  const [isNavigationHovered, setIsNavigationHovered] = useState(false);
  const [externalLabelChange, setExternalLabelChange] = useState(null);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const reminderRef = useRef(null);
  const lastShownNotificationRef = useRef(null);

  const dismissReminder = useCallback(() => {
    reminderRef.current?.dismiss?.();
  }, []);
  const router = useRouter();
  const pathname = usePathname();
  const { notifications } = useVisitorCount();
  const isArchiveEntryPage = useMemo(
    () => (pathname ? pathname.startsWith('/archive/entry/') : false),
    [pathname]
  );
  const isHidden = isArchiveEntryPage;

  /**
   * Opening and closing the navigation is symmetrical: when users collapse it we clear
   * the active item and panel id so the next expansion starts from a clean slate. This
   * makes "Chat" behave like a toggle rather than a sticky state.
   */
  const handleOpenChange = useCallback((nextOpen) => {
    if (nextOpen) {
      markArchiveNavigationUsed();
      trackMenuOpen();
    } else {
      trackMenuClose();
    }
    setIsNavigationOpen(nextOpen);

    if (!nextOpen) {
      setActiveItemId(null);
      setPanelId(null);
    }
  }, []);

  const handleItemSelect = useCallback(
    (itemId, href) => {
      // Don't open panel for live button (it shows count on hover instead)
      if (itemId === 'live') {
        trackMenuItemClick('live');
        return;
      }

      trackMenuItemClick(itemId);
      if (itemId === 'chat') {
        trackChatPanelOpen('archive');
      }

      // Keep navigation open when selecting items (works on both desktop and mobile)
      setActiveItemId((current) => (current === itemId ? null : itemId));

      if (href) {
        router.push(href);
      }
    },
    [router]
  );

  /**
   * Only the items with interactive panels are mapped below. This makes it trivial to
   * introduce new panels later by extending the switch.
   * When the navigation is closed we short-circuit to keep the panel hidden.
   * Note: The "live" button shows count on hover instead of opening a panel.
   */
  const panelContent = useMemo(() => {
    if (!isNavigationOpen || !activeItemId) {
      return null;
    }

    switch (activeItemId) {
      case 'chat':
        return {
          id: 'archive-navigation-panel-chat',
          panelType: 'chat',
          Content: ArchiveNavigationChatPanel,
        };
      case 'mood':
        return {
          id: 'archive-navigation-panel-mood',
          panelType: 'mood',
          Content: ArchiveNavigationMoodPanel,
        };
      default:
        return null;
    }
  }, [activeItemId, isNavigationOpen]);

  const isPanelOpen = Boolean(panelContent);

  /**
   * A few housekeeping effects keep navigation UX coherent:
   *   - Update `panelId` whenever the active panel changes so aria-controls stays valid.
   *   - Collapse the menu automatically on entry pages (they have their own navigation).
   */
  useEffect(() => {
    if (panelContent) {
      setPanelId(panelContent.id);
      return;
    }

    setPanelId(null);
  }, [panelContent]);

  /**
   * Entry detail pages hide the global floating navigation entirely. When we detect
   * such a path we immediately reset state so reopening the archive view later doesn't
   * resurrect a stale panel.
   */
  useEffect(() => {
    if (!isArchiveEntryPage) {
      return;
    }

    setIsNavigationOpen(false);
    setActiveItemId(null);
    setPanelId(null);
  }, [isArchiveEntryPage]);

  /**
   * When navigation is open and a new visitor joins, show the notification
   * in the label instead of the toast (which is hidden when navigation is open)
   * The navigation component will handle reverting to "Explore" after 3 seconds
   */
  useEffect(() => {
    if (!isNavigationOpen || notifications.length === 0) {
      return;
    }

    // Get the most recent notification
    const latestNotification = notifications[0];
    
    // Validate notification has required fields
    if (!latestNotification || typeof latestNotification !== 'object') {
      return;
    }
    
    // Only show visitor_joined notifications that we haven't shown yet
    if (
      latestNotification.type === 'visitor_joined' && 
      latestNotification.message &&
      typeof latestNotification.message === 'string' &&
      typeof latestNotification.timestamp === 'number' &&
      latestNotification.timestamp !== lastShownNotificationRef.current
    ) {
      // Mark this notification as shown
      lastShownNotificationRef.current = latestNotification.timestamp;
      
      // Change label to show notification
      // The navigation component will handle reverting to "Explore" after 3 seconds
      setExternalLabelChange(latestNotification.message);
    }
  }, [notifications, isNavigationOpen]);

  return (
    <div
      className={styles.archiveNavigationContainer}
      data-reminder-open={isReminderOpen ? 'true' : undefined}
    >
      <div
        className={styles.archiveNavigationPanel}
        id={panelId ?? undefined}
        data-state={isArchiveEntryPage ? 'closed' : isPanelOpen ? 'open' : 'closed'}
        data-presence={isHidden ? 'hidden' : 'visible'}
        data-panel-type={panelContent?.panelType ?? undefined}
        aria-hidden={isArchiveEntryPage || !isPanelOpen}
      >
        {panelContent ? <panelContent.Content /> : null}
      </div>
      {!isHidden && (
        <ArchiveNavigationReminder
          ref={reminderRef}
          isNavigationOpen={isNavigationOpen}
          isHidden={isHidden}
          onVisibilityChange={setIsReminderOpen}
        />
      )}
      <div
        className={styles.archiveNavWrapper}
        onMouseEnter={isReminderOpen ? dismissReminder : undefined}
        onClick={isReminderOpen ? dismissReminder : undefined}
      >
        <ArchiveNavigation
          isOpen={isHidden ? false : isNavigationOpen}
          onOpenChange={handleOpenChange}
          onItemSelect={handleItemSelect}
          items={NAVIGATION_ITEMS}
          activeItemId={activeItemId}
          panelId={panelId}
          isPanelOpen={isPanelOpen}
          isHidden={isHidden}
          onMouseEnter={() => !isNavigationOpen && setIsNavigationHovered(true)}
          onMouseLeave={() => setIsNavigationHovered(false)}
          externalLabelChange={externalLabelChange}
        />
      </div>
      {!isHidden && (
        <>
          {/* Bottom gradient - shown for mood/search panels */}
          <div
            className={styles.archiveNavigationGradient}
            data-state={isNavigationOpen && panelContent?.panelType !== 'chat' ? 'open' : 'closed'}
            aria-hidden="true"
          />
          {/* Right gradient - shown when chat panel is open */}
          <div
            className={styles.archiveNavigationGradientRight}
            data-state={isNavigationOpen && panelContent?.panelType === 'chat' ? 'open' : 'closed'}
            aria-hidden="true"
          />
        </>
      )}
      <ErrorBoundary>
        <VisitorNotificationToast 
          isNavigationOpen={isNavigationOpen}
          isPanelOpen={isPanelOpen}
          isNavigationHovered={isNavigationHovered}
        />
      </ErrorBoundary>
    </div>
  );
}

