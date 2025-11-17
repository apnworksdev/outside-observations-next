'use client';

import { useEffect, useRef } from 'react';
import styles from '@app/_assets/archive/closed.module.css';

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = MS_PER_SECOND * 60;
const MS_PER_HOUR = MS_PER_MINUTE * 60;

export default function Countdown() {
  const hoursListRef = useRef(null);
  const minutesListRef = useRef(null);
  const secondsListRef = useRef(null);
  const hoursElementsRef = useRef({});
  const minutesElementsRef = useRef({});
  const secondsElementsRef = useRef({});
  const currentActiveRef = useRef({ hours: null, minutes: null, seconds: null });

  useEffect(() => {
    const getNextTwelveOClock = () => {
      const now = new Date();

      // Helper to get next occurrence of a specific hour
      const getNextHour = (hour) => {
        const target = new Date(now);
        target.setHours(hour, 0, 0, 0);

        // If we've passed this hour today, move to tomorrow
        if (target <= now) {
          target.setDate(target.getDate() + 1);
        }

        return target;
      };

      // Get next noon (12:00 PM) and midnight (12:00 AM / 00:00:00)
      const nextNoon = getNextHour(12);
      const nextMidnight = getNextHour(0);

      // Return whichever comes first
      return nextNoon < nextMidnight ? nextNoon : nextMidnight;
    };

    const updateActiveClass = (elementsRef, currentActive, newActive) => {
      if (currentActive !== null && elementsRef.current[currentActive]) {
        elementsRef.current[currentActive].classList.remove(styles.active);
      }
      if (newActive !== null && elementsRef.current[newActive]) {
        elementsRef.current[newActive].classList.add(styles.active);
      }
    };

    const calculateTimeLeft = () => {
      const targetTime = getNextTwelveOClock();
      const now = new Date();
      const difference = Math.max(0, targetTime - now);

      const hours = Math.floor(difference / MS_PER_HOUR);
      const minutes = Math.floor((difference % MS_PER_HOUR) / MS_PER_MINUTE);
      const seconds = Math.floor((difference % MS_PER_MINUTE) / MS_PER_SECOND);

      // Map hours (0-11) to display (1-12): 0 -> 12, 1-11 -> 1-11
      const displayHour = hours === 0 ? 12 : hours;
      const displayMinute = minutes > 0 ? minutes : null;
      const displaySecond = seconds > 0 ? seconds : null;

      // Update active classes directly without re-rendering
      if (currentActiveRef.current.hours !== displayHour) {
        updateActiveClass(hoursElementsRef, currentActiveRef.current.hours, displayHour);
        currentActiveRef.current.hours = displayHour;
      }
      if (currentActiveRef.current.minutes !== displayMinute) {
        updateActiveClass(minutesElementsRef, currentActiveRef.current.minutes, displayMinute);
        currentActiveRef.current.minutes = displayMinute;
      }
      if (currentActiveRef.current.seconds !== displaySecond) {
        updateActiveClass(secondsElementsRef, currentActiveRef.current.seconds, displaySecond);
        currentActiveRef.current.seconds = displaySecond;
      }
    };

    // Calculate immediately
    calculateTimeLeft();

    // Update every second
    const interval = setInterval(calculateTimeLeft, MS_PER_SECOND);

    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num) => num.toString().padStart(2, '0');

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 59 }, (_, i) => i + 1);
  const seconds = Array.from({ length: 59 }, (_, i) => i + 1);

  return (
    <div className={styles.countdown}>
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

