'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import styles from '@app/_assets/archive/archive-navigation.module.css';
import ArchiveNavigation from './ArchiveNavigation';
import ArchiveNavigationMoodPanel from './ArchiveNavigationMoodPanel';
import ArchiveNavigationSearchPanel from './ArchiveNavigationSearchPanel';

const NAVIGATION_ITEMS = [
  {
    id: 'search',
    label: 'Search',
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
    id: 'continue',
    label: 'Continue your conversation',
    className: styles.archiveNavigationButtonContinue,
    href: null,
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
  const router = useRouter();
  const pathname = usePathname();
  const isArchiveEntryPage = useMemo(
    () => (pathname ? pathname.startsWith('/archive/entry/') : false),
    [pathname]
  );
  const isHidden = isArchiveEntryPage;

  /**
   * Opening and closing the navigation is symmetrical: when users collapse it we clear
   * the active item and panel id so the next expansion starts from a clean slate. This
   * makes “Search” behave like a toggle rather than a sticky state.
   */
  const handleOpenChange = useCallback((nextOpen) => {
    setIsNavigationOpen(nextOpen);

    if (!nextOpen) {
      setActiveItemId(null);
      setPanelId(null);
    }
  }, []);

  const handleItemSelect = useCallback(
    (itemId, href) => {
      setActiveItemId((current) => (current === itemId ? null : itemId));

      if (href) {
        router.push(href);
      }
    },
    [router]
  );

  /**
   * Only the items with interactive panels are mapped below. This makes it trivial to
   * introduce new panels later (e.g. “Continue” or “Live”) by extending the switch.
   * When the navigation is closed we short-circuit to keep the panel hidden.
   */
  const panelContent = useMemo(() => {
    if (!isNavigationOpen || !activeItemId) {
      return null;
    }

    switch (activeItemId) {
      case 'search':
        return {
          id: 'archive-navigation-panel-search',
          Content: ArchiveNavigationSearchPanel,
        };
      case 'mood':
        return {
          id: 'archive-navigation-panel-mood',
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
   * such a path we immediately reset state so reopening the archive view later doesn’t
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

  return (
    <>
      <ArchiveNavigation
        isOpen={isHidden ? false : isNavigationOpen}
        onOpenChange={handleOpenChange}
        onItemSelect={handleItemSelect}
        items={NAVIGATION_ITEMS}
        activeItemId={activeItemId}
        panelId={panelId}
        isPanelOpen={isPanelOpen}
        isHidden={isHidden}
      />
      {!isHidden && (
        <div
          className={styles.archiveNavigationGradient}
          data-state={isNavigationOpen ? 'open' : 'closed'}
          aria-hidden="true"
        />
      )}
      <div
        className={styles.archiveNavigationPanel}
        id={panelId ?? undefined}
        data-state={isArchiveEntryPage ? 'closed' : isPanelOpen ? 'open' : 'closed'}
        data-presence={isHidden ? 'hidden' : 'visible'}
        aria-hidden={isArchiveEntryPage || !isPanelOpen}
      >
        {panelContent ? <panelContent.Content /> : null}
      </div>
    </>
  );
}

