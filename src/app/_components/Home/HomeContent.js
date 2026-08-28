'use client';

import { useState, useEffect, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import FirstVisitAnimation from '@/app/_components/Home/FirstVisitAnimation';
import { ErrorBoundary } from '@/app/_components/shared/error/ErrorBoundary';
import { HomeErrorFallback } from '@/app/_components/shared/error/ErrorFallbacks';
import { isFirstWebsiteVisit, markWebsiteAsVisited } from '@/app/_helpers/tracking/websiteVisitState';
import { clearChatStorage } from '@/app/_helpers/storage/chatStorage';
import { trackFirstVisitAnimationSkip } from '@/app/_helpers/analytics/gtag';
import errorStyles from '@app/_assets/shared/error.module.css';

export default function HomeContent() {
  const router = useRouter();
  const [resolvedReturningVisitor, setResolvedReturningVisitor] = useState(null);

  useLayoutEffect(() => {
    setResolvedReturningVisitor(!isFirstWebsiteVisit());
  }, []);

  useEffect(() => {
    router.prefetch('/archive');
    fetch('/archive', { priority: 'low' }).catch(() => {});
  }, [router]);

  useEffect(() => {
    if (resolvedReturningVisitor === true) {
      markWebsiteAsVisited();
      router.replace('/archive');
    }
  }, [resolvedReturningVisitor, router]);

  useEffect(() => {
    if (resolvedReturningVisitor === false) {
      clearChatStorage();
    }
  }, [resolvedReturningVisitor]);

  useEffect(() => {
    if (resolvedReturningVisitor !== false) return undefined;
    document.body.setAttribute('data-home-visitor', 'first');
    return () => document.body.removeAttribute('data-home-visitor');
  }, [resolvedReturningVisitor]);

  const goToArchive = () => {
    markWebsiteAsVisited();
    router.replace('/archive');
  };

  if (resolvedReturningVisitor !== false) {
    return null;
  }

  return (
    <ErrorBoundary fallback={HomeErrorFallback}>
      <ErrorBoundary
        fallback={(error, reset) => (
          <div className={errorStyles.container}>
            <p className={errorStyles.message}>Animation failed to load. Opening the archive...</p>
            <button
              onClick={() => {
                trackFirstVisitAnimationSkip();
                reset();
                goToArchive();
              }}
              className={errorStyles.button}
              type="button"
            >
              Skip animation
            </button>
          </div>
        )}
      >
        <FirstVisitAnimation onComplete={goToArchive} />
      </ErrorBoundary>
    </ErrorBoundary>
  );
}
