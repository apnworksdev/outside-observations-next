import Link from 'next/link';
import { cookies } from 'next/headers';

import styles from '@app/_assets/nav.module.css';
import ArchiveViewToggle from '@/app/_components/Archive/ArchiveViewToggle';
import NavItem from '@/app/_components/NavItem';

const VIEW_COOKIE_NAME = 'outside-observations-archive-view';

export default async function HeaderNav() {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(VIEW_COOKIE_NAME)?.value ?? 'list';
  const initialView = cookieValue === 'images' || cookieValue === 'list' ? cookieValue : 'list';

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
                initialExternalView={initialView}
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