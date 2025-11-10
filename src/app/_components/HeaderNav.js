import Link from 'next/link';

import styles from '@app/_assets/nav.module.css';
import ArchiveViewToggle from '@/app/_components/Archive/ArchiveViewToggle';
import NavItem from '@/app/_components/NavItem';

export default function HeaderNav() {
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
              <ArchiveViewToggle className={`${styles.archiveNavOption} ${styles.navBubble}`} />
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
            <Link href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">Shop</Link>
          </li>
        </menu>
      </nav>
    </header>
  );
}