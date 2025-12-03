'use client';

import styles from '@app/_assets/nav.module.css';

export default function MobileMenuButton() {
  const handleMenuToggle = () => {
    document.body.classList.toggle('mobile-nav-open');
  };

  return (
    <div className={`${styles.navMenuMobile} ${styles.navBubble}`}>
      <button 
        className={styles.navMenuMobileButton} 
        type="button"
        onClick={handleMenuToggle}
      >
        Menu
      </button>
    </div>
  );
}

