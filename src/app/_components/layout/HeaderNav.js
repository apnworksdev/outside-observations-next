'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import styles from '@app/_assets/layout/nav.module.css';
import ArchiveViewToggle from '@/app/_components/Archive/features/list/ArchiveViewToggle';
import ArchiveThumbnailSizer from '@/app/_components/Archive/features/list/ArchiveThumbnailSizer';
import NavItem from '@/app/_components/layout/NavItem';
import NavDropdown from '@/app/_components/layout/NavDropdown';
import HeaderSearch from '@/app/_components/layout/HeaderSearch';
import HeaderVisitorCount from '@/app/_components/layout/HeaderVisitorCount';
import MobileMenuButton from '@/app/_components/layout/MobileMenuButton';
import HelpNav from '@/app/_components/layout/HelpNav';
import NewsletterPopup from '@/app/_components/layout/NewsletterPopup';
import { useRadioIframe } from '@/app/_components/shared/RadioIframeProvider';
import {
  trackNavClick,
  trackRadioOpen,
  trackRadioClose,
  trackRadioExpand,
  trackOutboundClick,
} from '@/app/_helpers/analytics/gtag';

const SHOP_URL = 'https://shop.outsideobservations.com/';
const UNEXPECTED_CONNECTIONS_URL = '/archive/unexpected-connections';
const MOODBOARD_VISUALIZER_URL = 'https://visualize.outsideobservations.com/';

export default function HeaderNav({ newsletterTitle, newsletterDescription }) {
  const { openRadio, closeRadio, expandRadio, isOpen: isRadioOpen, isMinimized } = useRadioIframe();
  const pathname = usePathname() ?? '';
  const isLaboratoryActive = pathname.startsWith(UNEXPECTED_CONNECTIONS_URL);
  const isArchiveActive =
    !isLaboratoryActive && (pathname === '/archive' || pathname.startsWith('/archive/'));

  // View preference is read from localStorage client-side by ArchiveViewToggle

  const handleRadioClick = (e) => {
    e.preventDefault();
    if (!isRadioOpen) {
      trackRadioOpen();
      const rect = e.currentTarget.getBoundingClientRect();
      openRadio({
        top: rect.top,
        right: rect.right,
        left: rect.left,
        height: rect.height,
      });
    }
  };

  const laboratoryItems = [
    {
      label: 'Unexpected Connections',
      href: UNEXPECTED_CONNECTIONS_URL,
      onClick: () => trackNavClick('unexpected_connections', 'same_page'),
    },
    {
      label: 'Moodboard visualizer',
      href: MOODBOARD_VISUALIZER_URL,
      external: true,
      onClick: () => trackOutboundClick('moodboard_visualizer', MOODBOARD_VISUALIZER_URL),
    },
  ];

  return (
    <header id="main-header" className={styles.header}>
      <div className={styles.headerTopRow}>
        <div className={styles.navTitleContainer}>
          <div className={styles.navTitle}>
            <Link
              href="/"
              className={styles.navLogo}
              data-transition="nav"
              aria-label="Outside Observations - home"
              onClick={() => trackNavClick('logo', 'same_page')}
            >
              <Image
                src="/logo.png"
                alt="Outside Observations"
                width={30}
                height={41}
                priority
                className={styles.navLogoImage}
              />
            </Link>
          </div>
          <MobileMenuButton />
        </div>

        <nav className={styles.navNavigation}>
          <menu>
            <NavItem
              className={`${styles.navLi} archive-nav`}
              innerNavBubble={true}
              href="/archive"
              section="archive"
              label="Archive"
              isActive={isArchiveActive}
              onClick={() => trackNavClick('archive', 'same_page')}
            />
            <NavItem
              className={`${styles.navLi} work-with-us-nav`}
              innerNavBubble={true}
              href="/lab"
              section="work-with-us"
              label="Work with us"
              onClick={() => trackNavClick('work_with_us', 'same_page')}
            />
            <NavItem
              className={`${styles.navLi} writings-nav`}
              innerNavBubble={true}
              href="/writings"
              section="writings"
              label="Writings"
              onClick={() => trackNavClick('writings', 'same_page')}
            />
            <NavDropdown
              className="laboratory-nav"
              label="OO Laboratory"
              items={laboratoryItems}
              isActive={isLaboratoryActive}
            />
            <NavItem
              className={`${styles.navLi} radio-nav`}
              innerNavBubble={true}
              href="https://www.outsideobservations.radio/"
              section="radio"
              onClick={handleRadioClick}
              isActive={isRadioOpen}
              label="Radio"
            >
              {isRadioOpen && isMinimized && (
                <div className={styles.radioNavButtons}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      trackRadioExpand();
                      expandRadio();
                    }}
                    className={`${styles.radioNavButton} ${styles.expandButton}`}
                    aria-label="Expand radio"
                  ></button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      trackRadioClose();
                      closeRadio();
                    }}
                    className={`${styles.radioNavButton} ${styles.closeButton}`}
                    aria-label="Close radio"
                  ></button>
                </div>
              )}
            </NavItem>
            <NavItem
              className={`${styles.navLi} shop-nav`}
              innerNavBubble={true}
              href={SHOP_URL}
              section="shop"
              target="_blank"
              rel="noreferrer"
              label="Shop"
              onClick={() => trackOutboundClick('shop', SHOP_URL)}
            />
          </menu>
        </nav>

        <div className={styles.headerUtilities}>
          <HeaderSearch />
          <NewsletterPopup title={newsletterTitle} description={newsletterDescription} />
          <HeaderVisitorCount />
        </div>
      </div>

      <div className={styles.archiveNavOptions}>
        <ArchiveViewToggle className={`${styles.archiveNavOption} ${styles.navBubble}`} />
        <ArchiveThumbnailSizer />
        <HelpNav />
        <div className={styles.featuredNavRow}>
          <Link
            href="/archive/widline-cadet"
            prefetch={false}
            className={`${styles.navBubble} ${styles.featuredNavBubble}`}
            data-transition="nav"
            data-active={pathname.startsWith('/archive/widline-cadet') ? 'true' : 'false'}
            onClick={() => trackNavClick('widline_cadet', 'same_page')}
          >
            Widline Cadet
          </Link>
        </div>
      </div>
    </header>
  );
}
