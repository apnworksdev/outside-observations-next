'use client';

import { useEffect, useRef } from 'react';
import styles from '@app/_assets/archive/closed.module.css';
import { isInClosedHours as isInClosedHoursLib, getNextTargetHourInZone } from '@/lib/closedArchiveHours';

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = MS_PER_SECOND * 60;
const MS_PER_HOUR = MS_PER_MINUTE * 60;

/** Local-time check when no timeZone is provided. */
function isInClosedHoursLocal(startHour, endHour) {
  const hour = new Date().getHours();
  return hour >= startHour && hour < endHour;
}

/** Next occurrence of targetHour (0–23) in local time, as a Date for countdown. */
function getNextTargetHourLocal(targetHour) {
  const now = new Date();
  const target = new Date(now);
  target.setHours(targetHour, 0, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target;
}

/**
 * @param {Object} [props.closedHours] - When set, countdown only runs during closed window and counts to open time.
 *   e.g. { startHour: 3, endHour: 6, timeZone?: 'UTC' } - timeZone uses lib config when set (matches middleware).
 */
export default function Countdown({ closedHours }) {
  const hoursListRef = useRef(null);
  const minutesListRef = useRef(null);
  const secondsListRef = useRef(null);
  const hoursElementsRef = useRef({});
  const minutesElementsRef = useRef({});
  const secondsElementsRef = useRef({});
  const currentActiveRef = useRef({ hours: null, minutes: null, seconds: null });
  const staticZeroSetRef = useRef(false);

  useEffect(() => {
    const startHour = closedHours?.startHour ?? 3;
    const endHour = closedHours?.endHour ?? 6;
    const timeZone = closedHours?.timeZone;

    const isClosed = timeZone
      ? () => isInClosedHoursLib(timeZone)
      : () => isInClosedHoursLocal(startHour, endHour);

    const getTargetTime = () => {
      if (closedHours) {
        return timeZone
          ? getNextTargetHourInZone(timeZone, endHour)
          : getNextTargetHourLocal(endHour);
      }
      const now = new Date();
      const getNextHour = (hour) => {
        const target = new Date(now);
        target.setHours(hour, 0, 0, 0);
        if (target <= now) target.setDate(target.getDate() + 1);
        return target;
      };
      const nextNoon = getNextHour(12);
      const nextMidnight = getNextHour(0);
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

    const setStaticZero = () => {
      updateActiveClass(hoursElementsRef, currentActiveRef.current.hours, 0);
      currentActiveRef.current.hours = 0;
      updateActiveClass(minutesElementsRef, currentActiveRef.current.minutes, 0);
      currentActiveRef.current.minutes = 0;
      updateActiveClass(secondsElementsRef, currentActiveRef.current.seconds, 0);
      currentActiveRef.current.seconds = 0;
    };

    const calculateTimeLeft = () => {
      if (closedHours) {
        const closed = isClosed();
        if (!closed) {
          if (!staticZeroSetRef.current) {
            setStaticZero();
            staticZeroSetRef.current = true;
          }
          return;
        }
        staticZeroSetRef.current = false;
      }

      const targetTime = getTargetTime();
      const now = new Date();
      const difference = Math.max(0, targetTime - now);

      const hours = Math.floor(difference / MS_PER_HOUR);
      const minutes = Math.floor((difference % MS_PER_HOUR) / MS_PER_MINUTE);
      const seconds = Math.floor((difference % MS_PER_MINUTE) / MS_PER_SECOND);

      const displayHour = hours;
      const displayMinute = minutes;
      const displaySecond = seconds;

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

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, MS_PER_SECOND);
    return () => clearInterval(interval);
  }, [closedHours]);

  const formatNumber = (num) => num.toString().padStart(2, '0');

  const hours = Array.from({ length: 13 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const seconds = Array.from({ length: 60 }, (_, i) => i);

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

