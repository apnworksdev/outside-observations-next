'use client';

import { useState, useEffect } from 'react';
import FirstVisitAnimation from '@/app/_components/Home/FirstVisitAnimation';
import ChatBox from '@/app/_components/Home/ChatBox';
import { ErrorBoundary } from '@/app/_components/ErrorBoundary';
import { HomeErrorFallback, ChatErrorFallback } from '@/app/_components/ErrorFallbacks';
import { markWebsiteAsVisited } from '@/app/_helpers/visitTracker';
import styles from '@app/_assets/error.module.css';

/**
 * HomeContent - Home page content component
 * 
 * Note: Middleware redirects non-first-time visitors to /archive before this component renders.
 * Therefore, if this component renders, it's guaranteed to be a first-time visitor.
 */
export default function HomeContent() {
  const [animationComplete, setAnimationComplete] = useState(false);

  const handleAnimationComplete = () => {
    setAnimationComplete(true);
    // Mark website as visited after animation completes
    // This ensures the cookie is set so middleware can redirect on next visit
    markWebsiteAsVisited();
  };

  // Manage body class for CSS-based header visibility control
  useEffect(() => {
    if (animationComplete) {
      document.body.classList.add('home-animation-complete');
    } else {
      document.body.classList.remove('home-animation-complete');
    }

    // Cleanup: remove class on unmount
    return () => {
      document.body.classList.remove('home-animation-complete');
    };
  }, [animationComplete]);

  return (
    <ErrorBoundary fallback={HomeErrorFallback}>
      <div>
        <ErrorBoundary
          fallback={(error, reset) => (
            <div className={styles.container}>
              <p className={styles.message}>Animation failed to load. Starting chat interface...</p>
              <button
                onClick={() => {
                  reset();
                  handleAnimationComplete();
                }}
                className={styles.button}
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

