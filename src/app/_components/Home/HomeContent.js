'use client';

import { useState, useEffect, useLayoutEffect } from 'react';
import Link from 'next/link';
import SanityImage from '@/sanity/components/SanityImage';
import KlaviyoForm from '@/app/_components/LaunchCountdown/KlaviyoForm';
import FirstVisitAnimation from '@/app/_components/Home/FirstVisitAnimation';
import ChatBox from '@/app/_components/Home/ChatBox';
import { ErrorBoundary } from '@/app/_components/ErrorBoundary';
import { HomeErrorFallback, ChatErrorFallback } from '@/app/_components/ErrorFallbacks';
import { isFirstWebsiteVisit, markWebsiteAsVisited } from '@/app/_helpers/visitTracker';
import { clearChatStorage } from '@/app/_helpers/chatStorage';
import { trackFirstVisitAnimationSkip } from '@/app/_helpers/gtag';
import errorStyles from '@app/_assets/error.module.css';
import homeStyles from '@app/_assets/home.module.css';

/**
 * HomeContent - Home page content component
 *
 * Two states:
 * - First-time visitor: FirstVisitAnimation → ChatBox (localStorage set on animation complete).
 * - Returning visitor: simple welcome view (no redirect to /archive).
 *
 * Returning visitor is resolved client-side from localStorage (server cannot read it).
 */
const DEFAULT_HOME_TITLE = 'Sign up to stay updated.';
const DEFAULT_HOME_DESCRIPTION = "Look at anything carefully enough, even a speck of dust, and you'll find something you missed.";

export default function HomeContent({
  homeImage = null,
  homeImageWidth = 1200,
  homeImageHeight,
  homeTitle,
  homeDescription,
}) {
  const title = homeTitle?.trim() || DEFAULT_HOME_TITLE;
  const description = homeDescription?.trim() || DEFAULT_HOME_DESCRIPTION;
  const [animationComplete, setAnimationComplete] = useState(false);
  // Resolved from localStorage after hydration; null = not yet known (treat as returning to avoid flash)
  const [resolvedReturningVisitor, setResolvedReturningVisitor] = useState(null);

  useLayoutEffect(() => {
    setResolvedReturningVisitor(!isFirstWebsiteVisit());
  }, []);

  // Default to returning when unknown so returning visitors don't see a flash of first-visit UI
  const isReturningVisitor = resolvedReturningVisitor !== null ? resolvedReturningVisitor : true;

  // Clear chat history on mount to ensure clean state for first visit animation
  // This handles cases where localStorage was cleared but chat history persisted elsewhere
  useEffect(() => {
    if (!isReturningVisitor) {
      clearChatStorage();
    }
  }, [isReturningVisitor]);

  const handleAnimationComplete = () => {
    setAnimationComplete(true);
    // Mark website as visited after animation completes (cookie for next time)
    markWebsiteAsVisited();
  };

  // Body attribute for CSS: first-visit home (animation/chat) vs returning home (welcome + newsletter)
  useEffect(() => {
    if (resolvedReturningVisitor === null) return;
    document.body.setAttribute('data-home-visitor', isReturningVisitor ? 'returning' : 'first');
    return () => document.body.removeAttribute('data-home-visitor');
  }, [isReturningVisitor, resolvedReturningVisitor]);

  // Manage body class for CSS-based header visibility control (first-visit flow only)
  useEffect(() => {
    if (isReturningVisitor) {
      document.body.classList.add('home-animation-complete');
      return () => document.body.classList.remove('home-animation-complete');
    }
    if (animationComplete) {
      document.body.classList.add('home-animation-complete');
    } else {
      document.body.classList.remove('home-animation-complete');
    }
    return () => document.body.classList.remove('home-animation-complete');
  }, [animationComplete, isReturningVisitor]);

  // Returning visitor: show dedicated homepage state (no animation, no redirect)
  if (isReturningVisitor) {
    return (
      <ErrorBoundary fallback={HomeErrorFallback}>
        <>
        <div className={homeStyles.homeContainer}>
          <div className={homeStyles.homeContentText}>
            <h1 className={homeStyles.homeContentTextTitle}>{title}</h1>
            <br/>
            <p className={homeStyles.homeContentTextDescription}>{description}</p>
          </div>
          <div className={homeStyles.homeActions}>
            <div className={homeStyles.homeKlaviyoFormContainer}>
              <KlaviyoForm />
            </div>
          </div>
        </div>
        {homeImage?.asset?._ref && (
          <Link href="/archive">
            <div className={homeStyles.homeImageContainer}>
              <SanityImage
                image={homeImage}
                alt="Outside Observations® Home Image"
                width={homeImageWidth}
                height={homeImageHeight ?? homeImageWidth}
                className={homeStyles.homeImage}
                priority={true}
                loading="eager"
              />
            </div>
          </Link>
        )}
        </>
      </ErrorBoundary>
    );
  }

  // First-time visitor: animation then chat
  return (
    <ErrorBoundary fallback={HomeErrorFallback}>
      <div>
        <ErrorBoundary
          fallback={(error, reset) => (
            <div className={errorStyles.container}>
              <p className={errorStyles.message}>Animation failed to load. Starting chat interface...</p>
              <button
                onClick={() => {
                  trackFirstVisitAnimationSkip();
                  reset();
                  handleAnimationComplete();
                }}
                className={errorStyles.button}
                type="button"
              >
                Skip animation
              </button>
            </div>
          )}
        >
          <FirstVisitAnimation onComplete={handleAnimationComplete}>
            <ErrorBoundary fallback={ChatErrorFallback}>
              <ChatBox />
            </ErrorBoundary>
          </FirstVisitAnimation>
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
}

