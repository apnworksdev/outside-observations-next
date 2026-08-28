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

/**
 * HomeContent - Home page content component
 *
 * The home page is no longer a destination (the archive is where the site
 * starts, per the V2 brief):
 * - First-time visitor: intro animation (ring of dots, mottos, lines sliding
 *   down), then straight to /archive.
 * - Returning visitor: immediate redirect to /archive.
 *
 * Returning visitor is resolved client-side from localStorage (server cannot read it).
 */
export default function HomeContent() {
  const router = useRouter();
  // Resolved from localStorage after hydration; null = not yet known
  const [resolvedReturningVisitor, setResolvedReturningVisitor] = useState(null);

  useLayoutEffect(() => {
    setResolvedReturningVisitor(!isFirstWebsiteVisit());
  }, []);

  // The archive is where every path out of this page leads. router.prefetch
  // fills the client router cache (production only -- it is a no-op in dev);
  // the plain fetch warms the route itself (server render, ISR cache, and in
  // dev the on-demand compile), so the animation's ~7s absorb the whole cost.
  useEffect(() => {
    router.prefetch('/archive');
    fetch('/archive', { priority: 'low' }).catch(() => {});
  }, [router]);

  // Returning visitor who slipped past the server redirect (visits from before
  // the cookie existed): set the cookie for next time and leave right away.
  useEffect(() => {
    if (resolvedReturningVisitor === true) {
      markWebsiteAsVisited();
      router.replace('/archive');
    }
  }, [resolvedReturningVisitor, router]);

  // Clean state so the animation starts from scratch.
  useEffect(() => {
    if (resolvedReturningVisitor === false) {
      clearChatStorage();
    }
  }, [resolvedReturningVisitor]);

  // Body attribute for CSS (header stays hidden during the intro). Never
  // 'returning': that legacy state opened the newsletter panel, and returning
  // visitors are redirected instead.
  useEffect(() => {
    if (resolvedReturningVisitor !== false) return undefined;
    document.body.setAttribute('data-home-visitor', 'first');
    return () => document.body.removeAttribute('data-home-visitor');
  }, [resolvedReturningVisitor]);

  const goToArchive = () => {
    markWebsiteAsVisited();
    router.replace('/archive');
  };

  // Unknown yet (first client paint) or returning: nothing to show, the
  // redirect is on its way.
  if (resolvedReturningVisitor !== false) {
    return null;
  }

  // First-time visitor: animation, then the archive.
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
