'use client';

import { useState } from 'react';
import CircleAnimation from '@/app/_components/Home/CircleAnimation';
import ChatBox from '@/app/_components/Home/ChatBox';
import { ErrorBoundary } from '@/app/_components/ErrorBoundary';
import { HomeErrorFallback, ChatErrorFallback } from '@/app/_components/ErrorFallbacks';
import styles from '@app/_assets/error.module.css';

export default function HomeContent() {
  const [animationComplete, setAnimationComplete] = useState(false);

  return (
    <ErrorBoundary fallback={HomeErrorFallback}>
      <div>
        {!animationComplete && (
          <ErrorBoundary
            fallback={(error, reset) => (
              <div className={styles.container}>
                <p className={styles.message}>Animation failed to load. Starting chat interface...</p>
                <button
                  onClick={() => {
                    reset();
                    setAnimationComplete(true);
                  }}
                  className={styles.button}
                  type="button"
                >
                  Skip animation
                </button>
              </div>
            )}
          >
            <CircleAnimation onComplete={() => setAnimationComplete(true)} />
          </ErrorBoundary>
        )}
        {animationComplete && (
          <ErrorBoundary fallback={ChatErrorFallback}>
            <ChatBox />
          </ErrorBoundary>
        )}
      </div>
    </ErrorBoundary>
  );
}

