'use client';

import Link from 'next/link';

import styles from '@app/_assets/nav.module.css';
import ArchiveViewToggle from '@/app/_components/Archive/ArchiveViewToggle';
import NavItem from '@/app/_components/NavItem';
import MobileMenuButton from '@/app/_components/MobileMenuButton';
import HelpNav from '@/app/_components/HelpNav';
import { useRadioIframe } from '@/app/_components/RadioIframeProvider';
import {
  trackNavClick,
  trackRadioOpen,
  trackRadioClose,
  trackRadioExpand,
  trackOutboundClick,
} from '@/app/_helpers/gtag';

const SHOP_URL = 'https://shop.outsideobservations.com/';

export default function HeaderNav() {
  const { openRadio, closeRadio, expandRadio, isOpen: isRadioOpen, isMinimized } = useRadioIframe();

  // View preference is read from localStorage client-side by ArchiveViewToggle

  const handleRadioClick = (e) => {
    e.preventDefault();
    if (!isRadioOpen) {
      trackRadioOpen();
      openRadio();
    }
  };

  return (
    <header id="main-header" className={styles.header}>
      <div className={styles.navTitleContainer}>
        <div className={styles.navTitle}>
          <Link
            href="/"
            className={styles.navBubble}
            data-transition="nav"
            onClick={() => trackNavClick('logo', 'same_page')}
          >
            O
            <span className={`${styles.navTitleSpan} ${styles.outside}`}>utside</span>
            O
            <span className={`${styles.navTitleSpan} ${styles.observations}`}>bservations</span>
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
            onClick={() => trackNavClick('archive', 'same_page')}
          >
            <div className={styles.archiveNavOptions}>
              <ArchiveViewToggle
                className={`${styles.archiveNavOption} ${styles.navBubble}`}
              />
              <div className={styles.backToArchiveButton}>
                <Link
                  href="/archive"
                  className={styles.navBubble}
                  data-transition="nav"
                  onClick={() => trackNavClick('back_to_archive', 'same_page')}
                >
                  Back
                </Link>
              </div>
              <HelpNav />
            </div>
          </NavItem>
          <NavItem
            className={`${styles.navLi} lab-nav`}
            innerNavBubble={true}
            href="/lab"
            section="lab"
            label="Lab"
            onClick={() => trackNavClick('lab', 'same_page')}
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
    </header>
  );
}