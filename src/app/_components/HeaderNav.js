import Link from 'next/link';
import styles from '@app/_assets/nav.module.css'
import ArchiveViewToggle from '@app/_components/ArchiveViewToggle';

export default function HeaderNav() {

  return (
    <header id="main-header" className={styles.header}>
      <div className={styles.navTitleContainer}>
        <div className={`${styles.navTitle} ${styles.navBubble}`}>
          <Link href="/">O<span className={`${styles.navTitleSpan} ${styles.outside}`}>utside</span>O<span className={`${styles.navTitleSpan} ${styles.observations}`}>bservations</span></Link>
        </div>
        <div className={`${styles.navMenuMobile} ${styles.navBubble}`}>
          <button className={styles.navMenuMobileButton} type="button">
            Menu
          </button>
        </div>
      </div>
      <nav className={styles.navNavigation}>
        <menu>
          <li className={`${styles.navLi} ${styles.navBubble} archive-nav`}>
            <Link href="/archive">
              Archive
            </Link>
            <div className={styles.archiveNavOptions}>
              <ArchiveViewToggle className={`${styles.archiveNavOption} ${styles.navBubble}`} />
              <div className={`${styles.archiveNavOption} ${styles.navBubble}`}>
                <button type="button">?</button>
              </div>
            </div>
          </li>
          <li className={`${styles.navLi} ${styles.navBubble} lab-nav`}>
            <Link href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">
              Lab
            </Link>
          </li>
          <li className={`${styles.navLi} ${styles.navBubble} radio-nav`}>
            <Link href="https://www.outsideobservations.radio/">
              Radio
            </Link>
          </li>
          <li className={`${styles.navLi} ${styles.navBubble} shop-nav`}>
            <Link href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">Shop</Link>
          </li>
        </menu>
      </nav>
    </header>
  );
}