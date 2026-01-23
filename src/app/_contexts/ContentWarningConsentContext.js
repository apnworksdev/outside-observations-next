'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { getLocalStorage, setLocalStorage } from '@/app/_helpers/localStorage';

const CONTENT_WARNING_CONSENT_KEY = 'content_warning_consent';

const ContentWarningConsentContext = createContext({
  hasConsent: false,
  setConsent: () => {},
  isMounted: false,
});

/**
 * Provider that manages content warning consent state globally.
 * Checks localStorage only once and shares the state across all components.
 */
export function ContentWarningConsentProvider({ children }) {
  // Always start with false for SSR consistency (prevents hydration mismatch)
  // We'll read localStorage in useEffect after mount
  const [hasConsent, setHasConsentState] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Read consent from localStorage after mount (client-side only)
  useEffect(() => {
    setIsMounted(true);
    const consent = getLocalStorage(CONTENT_WARNING_CONSENT_KEY) === 'true';
    setHasConsentState(consent);
  }, []);

  // Listen for consent changes (when user accepts in any MediaProtector)
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;

    const handleConsentChange = () => {
      const consent = getLocalStorage(CONTENT_WARNING_CONSENT_KEY) === 'true';
      setHasConsentState(consent);
    };

    window.addEventListener('contentWarningConsent', handleConsentChange);
    
    return () => {
      window.removeEventListener('contentWarningConsent', handleConsentChange);
    };
  }, [isMounted]);

  const setConsent = useCallback(() => {
    setLocalStorage(CONTENT_WARNING_CONSENT_KEY, 'true');
    setHasConsentState(true);
    // Dispatch custom event so other components can react
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('contentWarningConsent', { detail: { consented: true } }));
    }
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({ hasConsent, setConsent, isMounted }),
    [hasConsent, setConsent, isMounted]
  );

  return (
    <ContentWarningConsentContext.Provider value={contextValue}>
      {children}
    </ContentWarningConsentContext.Provider>
  );
}

/**
 * Hook to access content warning consent state
 */
export function useContentWarningConsent() {
  const context = useContext(ContentWarningConsentContext);
  if (context === undefined) {
    throw new Error('useContentWarningConsent must be used within a ContentWarningConsentProvider');
  }
  return context;
}
