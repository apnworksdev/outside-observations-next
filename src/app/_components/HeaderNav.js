import Link from 'next/link';

import styles from '@app/_assets/nav.module.css';
import ArchiveViewToggle from '@/app/_components/Archive/ArchiveViewToggle';
import NavItem from '@/app/_components/NavItem';

export default function HeaderNav() {
  // Cookie reading is handled client-side by ArchiveViewToggle component
  // This allows static generation while still reading view preference on the client
  return (
    <header id="main-header" className={styles.header}>
      <div className={styles.navTitleContainer}>
        <div className={`${styles.navTitle} ${styles.navBubble}`}>
          <Link href="/">
            O
            <span className={`${styles.navTitleSpan} ${styles.outside}`}>utside</span>
            O
            <span className={`${styles.navTitleSpan} ${styles.observations}`}>bservations</span>
          </Link>
        </div>
        <div className={`${styles.navMenuMobile} ${styles.navBubble}`}>
          <button className={styles.navMenuMobileButton} type="button">
            Menu
          </button>
        </div>
      </div>
      <nav className={styles.navNavigation}>
        <menu>
          <NavItem
            className={`${styles.navLi} ${styles.navBubble} archive-nav`}
            href="/archive"
            section="archive"
            label="Archive"
          >
            <div className={styles.archiveNavOptions}>
              <ArchiveViewToggle
                className={`${styles.archiveNavOption} ${styles.navBubble}`}
              />
              <div className={`${styles.archiveNavOption} ${styles.navBubble}`}>
                <button type="button">?</button>
              </div>
            </div>
          </NavItem>
          <NavItem
            className={`${styles.navLi} ${styles.navBubble} lab-nav`}
            href="/lab"
            section="lab"
            label="Lab"
          />
          <NavItem
            className={`${styles.navLi} ${styles.navBubble} radio-nav`}
            href="https://www.outsideobservations.radio/"
            section="radio"
            target="_blank"
            rel="noreferrer"
            label="Radio"
          />
          <li className={`${styles.navLi} ${styles.navBubble} shop-nav`}>
            <Link href="https://outside-observations.myshopify.com/">Shop</Link>
          </li>
        </menu>
      </nav>
    </header>
  );
}