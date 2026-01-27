'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SanityImage from '@/sanity/components/SanityImage';
import KlaviyoForm from '@/app/_components/LaunchCountdown/KlaviyoForm';
import FirstVisitAnimation from '@/app/_components/Home/FirstVisitAnimation';
import ChatBox from '@/app/_components/Home/ChatBox';
import { ErrorBoundary } from '@/app/_components/ErrorBoundary';
import { HomeErrorFallback, ChatErrorFallback } from '@/app/_components/ErrorFallbacks';
import { markWebsiteAsVisited } from '@/app/_helpers/visitTracker';
import { clearChatStorage } from '@/app/_helpers/chatStorage';
import { trackFirstVisitAnimationSkip } from '@/app/_helpers/gtag';
import errorStyles from '@app/_assets/error.module.css';
import homeStyles from '@app/_assets/home.module.css';

/**
 * HomeContent - Home page content component
 *
 * Two states:
 * - First-time visitor: FirstVisitAnimation → ChatBox (cookie set on animation complete).
 * - Returning visitor: simple welcome view (no redirect to /archive).
 */
export default function HomeContent({
  isReturningVisitor = false,
  homeImage = null,
  homeImageWidth = 1200,
  homeImageHeight,
}) {
  const [animationComplete, setAnimationComplete] = useState(false);

  // Clear chat history on mount to ensure clean state for first visit animation
  // This handles cases where cookies are cleared but localStorage still has chat history
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
          <div className={homeStyles.homeContent}>
            <div className={homeStyles.homeContentText}>
              <h1 className={homeStyles.homeContentTextTitle}>Welcome to Outside Observations®</h1>
              <p className={homeStyles.homeContentTextDescription}>
                We&apos;re glad you&apos;re here.
                Use the menu on the left to explore, or tell me what you&apos;re looking for and I&apos;ll point you in the right direction.
              </p>
            </div>
            <div className={homeStyles.homeActions}>
              <div className={homeStyles.homeKlaviyoFormContainer}>
                <KlaviyoForm />
              </div>
              <Link href="/archive" className={homeStyles.homeArchiveLink}>
                Go to archive
              </Link>
            </div>
          </div>
        </div>
        {homeImage?.asset?._ref && (
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

