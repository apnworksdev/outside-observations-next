'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import styles from '@app/_assets/home.module.css';

export default function CircleAnimation({ onComplete }) {
  const totalCircles = 8;
  const containerRef = useRef(null);
  const circlesRef = useRef([]);

  useEffect(() => {
    const circles = circlesRef.current;
    if (!circles.length) return;

    // Create a timeline for better control
    const tl = gsap.timeline({
      onComplete: () => {
        if (onComplete) {
          onComplete();
        }
      },
    });

    // Animate each circle with stagger
    circles.forEach((circle, index) => {
      if (circle) {
        // Start from invisible
        gsap.set(circle, { opacity: 0 });
        
        // Add to timeline with stagger (0.5s initial delay, 0.2s between each)
        tl.to(circle, {
          opacity: 1,
          duration: 0.3,
          ease: 'power2.out',
        }, index * 0.2 + 0.5); // Stagger: 0.5s, 0.7s, 0.9s, etc.
      }
    });

    return () => {
      tl.kill(); // Clean up timeline on unmount
    };
  }, [onComplete]);

  return (
    <div ref={containerRef} className={styles.circleContainer}>
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

