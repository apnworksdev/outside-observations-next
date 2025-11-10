'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import styles from '@app/_assets/archive/archive-navigation.module.css';
import ArchiveNavigation from './ArchiveNavigation';

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

  const panelContent = useMemo(() => {
    if (!isNavigationOpen || !activeItemId) {
      return null;
    }

    switch (activeItemId) {
      case 'search':
        return {
          id: 'archive-navigation-panel-search',
          title: 'Search the archive',
          body: 'Start typing to uncover entries, moods, and connections. (Coming soon.)',
        };
      default:
        return null;
    }
  }, [activeItemId, isNavigationOpen]);

  const isPanelOpen = Boolean(panelContent);

  useEffect(() => {
    if (panelContent) {
      setPanelId(panelContent.id);
      return;
    }

    setPanelId(null);
  }, [panelContent]);

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
      <div
        className={styles.archiveNavigationPanel}
        id={panelId ?? undefined}
        data-state={isArchiveEntryPage ? 'closed' : isPanelOpen ? 'open' : 'closed'}
        data-presence={isHidden ? 'hidden' : 'visible'}
        aria-hidden={isArchiveEntryPage || !isPanelOpen}
      >
        {panelContent ? (
          <div className={styles.archiveNavigationPanelContent}>
            <h2 className={styles.archiveNavigationPanelTitle}>{panelContent.title}</h2>
            <p className={styles.archiveNavigationPanelBody}>{panelContent.body}</p>
          </div>
        ) : null}
      </div>
    </>
  );
}

