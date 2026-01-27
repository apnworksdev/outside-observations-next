'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getLocalStorage, setLocalStorage } from '@/app/_helpers/localStorage';
import { updateAnalyticsConsent, COOKIE_CONSENT_ANALYTICS_KEY } from '@/app/_helpers/gtag';
import styles from '@app/_assets/cookie-consent-banner.module.css';

const COOKIE_POLICY_HREF = '/privacy';

export default function CookieConsentBanner() {
  const pathname = usePathname();
  const [showBanner, setShowBanner] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isStudioRoute = pathname?.startsWith('/studio');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined' || isStudioRoute) return;

    const stored = getLocalStorage(COOKIE_CONSENT_ANALYTICS_KEY);
    if (stored === null || stored === undefined) {
      setShowBanner(true);
    } else if (stored === 'true') {
      updateAnalyticsConsent(true);
    }
  }, [mounted, isStudioRoute]);

  const accept = () => {
    setLocalStorage(COOKIE_CONSENT_ANALYTICS_KEY, 'true');
    updateAnalyticsConsent(true);
    setShowBanner(false);
  };

  const reject = () => {
    setLocalStorage(COOKIE_CONSENT_ANALYTICS_KEY, 'false');
    updateAnalyticsConsent(false);
    setShowBanner(false);
  };

  if (!mounted || !showBanner || isStudioRoute) return null;

  return (
    <div className={styles.container} role="dialog" aria-label="Cookie consent" data-hide-on-studio="true">
      <div className={styles.banner}>
        <div className={styles.bannerContent}>
          <h4>
            Cookies consent
          </h4>
          <br/>
          <p className={styles.text}>
            We use cookies for analytics. You can accept or refuse.{' '}
            <Link href={COOKIE_POLICY_HREF} className={styles.link}>
              Cookie policy
            </Link>
          </p>
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={reject} className={styles.buttonReject}>
            Reject
          </button>
          <button type="button" onClick={accept} className={styles.buttonAccept}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
