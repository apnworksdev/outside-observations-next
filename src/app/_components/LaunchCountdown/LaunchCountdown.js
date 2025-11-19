'use client';

import { useEffect, useRef } from 'react';
import styles from '@app/_assets/archive/closed.module.css';

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = MS_PER_SECOND * 60;
const MS_PER_HOUR = MS_PER_MINUTE * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;

// December 3rd, 2025 at 12:00 PM (noon)
const LAUNCH_DATE = new Date('2025-12-03T12:00:00');

export default function LaunchCountdown() {
  const daysListRef = useRef(null);
  const hoursListRef = useRef(null);
  const minutesListRef = useRef(null);
  const secondsListRef = useRef(null);
  const daysElementsRef = useRef({});
  const hoursElementsRef = useRef({});
  const minutesElementsRef = useRef({});
  const secondsElementsRef = useRef({});
  const currentActiveRef = useRef({ days: null, hours: null, minutes: null, seconds: null });

  useEffect(() => {
    const updateActiveClass = (elementsRef, currentActive, newActive) => {
      // Remove active class from old element synchronously
      if (currentActive !== null && elementsRef.current[currentActive]) {
        elementsRef.current[currentActive].classList.remove(styles.active);
      }
      // Use queueMicrotask to ensure the removal is processed before adding
      // This prevents both numbers from being visible simultaneously on iOS
      // while avoiding the delay of requestAnimationFrame
      queueMicrotask(() => {
        if (newActive !== null && elementsRef.current[newActive]) {
          elementsRef.current[newActive].classList.add(styles.active);
        }
      });
    };

    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = Math.max(0, LAUNCH_DATE - now);

      const days = Math.floor(difference / MS_PER_DAY);
      const hours = Math.floor((difference % MS_PER_DAY) / MS_PER_HOUR);
      const minutes = Math.floor((difference % MS_PER_HOUR) / MS_PER_MINUTE);
      const seconds = Math.floor((difference % MS_PER_MINUTE) / MS_PER_SECOND);

      // Update active classes directly without re-rendering
      if (currentActiveRef.current.days !== days) {
        updateActiveClass(daysElementsRef, currentActiveRef.current.days, days);
        currentActiveRef.current.days = days;
      }
      if (currentActiveRef.current.hours !== hours) {
        updateActiveClass(hoursElementsRef, currentActiveRef.current.hours, hours);
        currentActiveRef.current.hours = hours;
      }
      if (currentActiveRef.current.minutes !== minutes) {
        updateActiveClass(minutesElementsRef, currentActiveRef.current.minutes, minutes);
        currentActiveRef.current.minutes = minutes;
      }
      if (currentActiveRef.current.seconds !== seconds) {
        updateActiveClass(secondsElementsRef, currentActiveRef.current.seconds, seconds);
        currentActiveRef.current.seconds = seconds;
      }
    };

    // Calculate immediately
    calculateTimeLeft();

    // Update every second
    const interval = setInterval(calculateTimeLeft, MS_PER_SECOND);

    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num) => num.toString().padStart(2, '0');

  // Generate arrays for display
  const days = Array.from({ length: 31 }, (_, i) => i); // 0-99 days
  const hours = Array.from({ length: 24 }, (_, i) => i); // 0-23 hours
  const minutes = Array.from({ length: 60 }, (_, i) => i); // 0-59 minutes
  const seconds = Array.from({ length: 60 }, (_, i) => i); // 0-59 seconds

  return (
    <div className={styles.countdown}>
      <div className={styles.daysContainer}>
        <p className={styles.daysLabel}>DD</p>
        <div ref={daysListRef} className={styles.numberList}>
          {days.map((num) => (
            <p
              key={num}
              ref={(el) => {
                if (el) daysElementsRef.current[num] = el;
              }}
              className={styles.number}
            >
              {formatNumber(num)}
            </p>
          ))}
        </div>
      </div>
      <div className={styles.hoursContainer}>
        <p className={styles.hoursLabel}>HH</p>
        <div ref={hoursListRef} className={styles.numberList}>
          {hours.map((num) => (
            <p
              key={num}
              ref={(el) => {
                if (el) hoursElementsRef.current[num] = el;
              }}
              className={styles.number}
            >
              {formatNumber(num)}
            </p>
          ))}
        </div>
      </div>
      <div className={styles.minutesContainer}>
        <p className={styles.minutesLabel}>MM</p>
        <div ref={minutesListRef} className={styles.numberList}>
          {minutes.map((num) => (
            <span
              key={num}
              ref={(el) => {
                if (el) minutesElementsRef.current[num] = el;
              }}
              className={styles.number}
            >
              {formatNumber(num)}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.secondsContainer}>
        <p className={styles.secondsLabel}>SS</p>
        <div ref={secondsListRef} className={styles.numberList}>
          {seconds.map((num) => (
            <span
              key={num}
              ref={(el) => {
                if (el) secondsElementsRef.current[num] = el;
              }}
              className={styles.number}
            >
              {formatNumber(num)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

