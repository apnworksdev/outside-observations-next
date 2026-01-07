import Link from 'next/link';

import styles from '@app/_assets/nav.module.css';
import ArchiveViewToggle from '@/app/_components/Archive/ArchiveViewToggle';
import NavItem from '@/app/_components/NavItem';
import MobileMenuButton from '@/app/_components/MobileMenuButton';
import HelpNav from '@/app/_components/HelpNav';

export default function HeaderNav() {
  // Cookie reading is handled client-side by ArchiveViewToggle component
  // This allows static generation while still reading view preference on the client
  return (
    <header id="main-header" className={styles.header}>
      <div className={styles.navTitleContainer}>
        <div className={styles.navTitle}>
          <Link href="/archive" className={styles.navBubble} data-transition="nav">
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
          >
            <div className={styles.archiveNavOptions}>
              <ArchiveViewToggle
                className={`${styles.archiveNavOption} ${styles.navBubble}`}
              />
              <div className={styles.backToArchiveButton}>
                <Link href="/archive" className={styles.navBubble} data-transition="nav">Back</Link>
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
          />
          <NavItem
            className={`${styles.navLi} radio-nav`}
            innerNavBubble={true}
            href="https://www.outsideobservations.radio/"
            section="radio"
            target="_blank"
            rel="noreferrer"
            label="Radio"
          />
          <NavItem
            className={`${styles.navLi} shop-nav`}
            innerNavBubble={true}
            href="https://outside-observations.myshopify.com/"
            section="shop"
            target="_blank"
            rel="noreferrer"
            label="Shop"
          />
        </menu>
      </nav>
    </header>
  );
}