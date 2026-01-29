'use client';

import { useState, useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';
import KlaviyoForm from '@/app/_components/LaunchCountdown/KlaviyoForm';
import { isFirstWebsiteVisit } from '@/app/_helpers/visitTracker';
import styles from '@app/_assets/nav.module.css';

const DEFAULT_TITLE = 'Sign up to stay updated.';
const DEFAULT_DESCRIPTION = "Look at anything carefully enough, even a speck of dust, and you'll find something you missed.";

/**
 * Newsletter popup shown on all pages in the same position (fixed top-right).
 * Closed: button with "Newsletter" text. Open: title, description, form + close (X) button.
 * On home for returning visitors (data-home-visitor="returning"): always open, no close button.
 * On mobile, only visible on the homepage.
 */
export default function NewsletterPopup({ title, description }) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [isOpen, setIsOpen] = useState(false);
  // null until after hydration so server and client initial render match (localStorage is client-only)
  const [isReturningVisitor, setIsReturningVisitor] = useState(null);

  // Re-run when pathname changes so we pick up "visited" after user goes to archive then back to home
  useLayoutEffect(() => {
    setIsReturningVisitor(!isFirstWebsiteVisit());
  }, [pathname]);

  const isReturningHome = isHome && isReturningVisitor === true;
  const showOpenContent = isReturningHome || isOpen;
  const showCloseButton = isOpen && !isReturningHome;

  const displayTitle = title?.trim() || DEFAULT_TITLE;
  const displayDescription = description?.trim() || DEFAULT_DESCRIPTION;

  return (
    <div
      className={styles.newsletterPopupWrapper}
      data-visible-on-mobile={isHome}
      data-open={showOpenContent}
    >
      {showOpenContent ? (
        <div className={styles.newsletterPopupOpenContent}>
          {showCloseButton && (
            <button
              type="button"
              className={styles.newsletterPopupCloseButton}
              onClick={() => setIsOpen(false)}
              aria-label="Close newsletter"
            />
          )}
          <div className={styles.newsletterPopupContentText}>
            <h1>{displayTitle}</h1>
            <br />
            <p>{displayDescription}</p>
          </div>
          <div className={styles.newsletterPopupActions}>
            <div className={styles.newsletterPopupKlaviyoFormContainer}>
              <KlaviyoForm />
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={styles.navBubble}
          onClick={() => setIsOpen(true)}
          aria-label="Open newsletter signup"
        >
          Newsletter
        </button>
      )}
    </div>
  );
}
