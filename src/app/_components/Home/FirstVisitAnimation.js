'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { trackFirstVisitAnimationComplete } from '@/app/_helpers/analytics/gtag';
import styles from '@app/_assets/home/home.module.css';
import { setupFirstVisitTimeline } from './firstVisitAnimationTimeline';

/**
 * FirstVisitAnimation - Complex animation sequence for first-time visitors
 *
 * Orchestrates a multi-stage animation (same timing as previous circle-based sequence):
 * - Text reveals ("Create for each other", "Invest in each other", long text)
 * - Lines grid animation
 * - Typewriter effect for first message
 * - Form elements reveal
 * - Header fade-in
 */
export default function FirstVisitAnimation({ onComplete, children }) {
  const contentRef = useRef(null);
  const createTextRef = useRef(null);
  const investTextRef = useRef(null);
  const longTextRef = useRef(null);
  const timelineRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  const animationsSetupRef = useRef(false); // Guard to prevent multiple setups
  const [isClient, setIsClient] = useState(false);

  // Store onComplete in ref so it doesn't trigger re-runs
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Only render children on client to avoid hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Create shared timeline for the animation sequence
  useEffect(() => {
    if (!isClient) return;

    // Create shared timeline
    const tl = gsap.timeline({
      onComplete: () => {
        trackFirstVisitAnimationComplete();
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
      },
    });

    timelineRef.current = tl;

    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }
    };
  }, [isClient]);

  // Handle timing callback and set up animations (same timing as previous circle-based sequence)
  const handleCircleTimingReady = useCallback((timing) => {
    // Prevent multiple setups if callback is called multiple times
    if (animationsSetupRef.current) {
      return;
    }
    animationsSetupRef.current = true;
    
    setupFirstVisitTimeline({
      timing,
      timeline: timelineRef.current,
      contentRef,
      createTextRef,
      investTextRef,
      longTextRef,
    });
  }, []);

  // Trigger animation setup with same timing as before (no circles rendered)
  useEffect(() => {
    if (!isClient || !timelineRef.current) return;
    const startTime = 1.0;
    const stagger = 0.5;
    const initialDelay = 0;
    const circleTimes = Array.from({ length: 8 }, (_, i) => startTime + initialDelay + i * stagger);
    handleCircleTimingReady({
      startTime: startTime + initialDelay,
      stagger,
      circleTimes,
      getCircleTime: (index) => circleTimes[index],
    });
  }, [isClient, handleCircleTimingReady]);

  return (
    <>
      <div className={`${styles.firstVisitText} ${styles.firstVisitTextCreate}`} ref={createTextRef}>
        <p>Create for each other</p>
      </div>
      <div className={`${styles.firstVisitText} ${styles.firstVisitTextInvest}`} ref={investTextRef}>
        <p>Invest in each other</p>
      </div>
      <div className={`${styles.firstVisitText} ${styles.firstVisitTextLong}`} ref={longTextRef}>
        <p>By entering your email address on this website you allow Outside Observations® to reach out to you. By using our website, you agree to the use of cookies in order to deliver the best experience.</p>
      </div>
      <div ref={contentRef}>
        {isClient ? children : null}
      </div>
    </>
  );
}
