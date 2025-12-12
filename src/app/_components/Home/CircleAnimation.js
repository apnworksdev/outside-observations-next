'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import styles from '@app/_assets/home.module.css';

export default function CircleAnimation({ 
  onComplete, 
  timeline: externalTimeline,
  startTime = 0,
  stagger = 0.2,
  onTimingReady
}) {
  const totalCircles = 8;
  const circlesRef = useRef([]);
  const timelineRef = useRef(null);

  useEffect(() => {
    const circles = circlesRef.current;
    if (!circles.length) return;

    // Use external timeline if provided, otherwise create our own
    const tl = externalTimeline || gsap.timeline({
      onComplete: () => {
        if (onComplete) {
          onComplete();
        }
      },
    });

    // Only store ref if we created the timeline ourselves
    if (!externalTimeline) {
      timelineRef.current = tl;
    }

    // Calculate timing for each circle
    const initialDelay = externalTimeline ? 0 : 0.5; // Only use delay if we created timeline
    const circleTimes = circles.map((_, index) => startTime + initialDelay + (index * stagger));

    // Expose timing info to parent if callback provided
    if (onTimingReady) {
      onTimingReady({
        startTime: startTime + initialDelay,
        stagger,
        circleTimes,
        getCircleTime: (index) => circleTimes[index],
      });
    }

    // Filter out null circles
    const validCircles = circles.filter(Boolean);
    const circleDuration = 0.6;

    // Animate each circle with stagger
    validCircles.forEach((circle, index) => {
      // Start from invisible
      gsap.set(circle, { opacity: 0 });
      
      // Add to timeline at calculated time
      const circleTime = circleTimes[index];
      tl.to(circle, {
        opacity: 1,
        duration: circleDuration,
        ease: 'power2.out',
      }, circleTime);
    });

    // Fade out all circles simultaneously after the last circle finishes
    if (validCircles.length > 0) {
      const lastCircleEndTime = circleTimes[circleTimes.length - 1] + circleDuration;
      tl.to(validCircles, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
      }, lastCircleEndTime);
    }

    return () => {
      // Only clean up timeline if we created it ourselves
      if (!externalTimeline && timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }
    };
  }, [onComplete, externalTimeline, startTime, stagger, onTimingReady]);

  return (
    <div className={styles.circleContainer}>
      {Array.from({ length: totalCircles }, (_, index) => (
        <div
          key={index}
          ref={(el) => (circlesRef.current[index] = el)}
          data-number={index + 1}
          className={styles.circle}
        />
      ))}
    </div>
  );
}

