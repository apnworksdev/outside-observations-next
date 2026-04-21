'use client';

import { useEffect, useState } from 'react';
import Countdown from '@/app/_components/Countdown/Countdown';
import styles from '@app/_assets/archive/closed.module.css';
import {
  CLOSED_START_HOUR,
  CLOSED_END_HOUR,
  CLOSED_TIMEZONE,
  isInClosedHours,
  useTimezoneRedirect,
} from '@/lib/closedArchiveHours';

export default function ClosedArchiveCountdownSection() {
  const [mounted, setMounted] = useState(false);
  const [closed, setClosed] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const tick = () => setClosed(isInClosedHours());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [mounted]);

  if (!mounted) {
    return (
      <div className={styles.topContent}>
        <h1 className={styles.title}>The archive will open in:</h1>
        <div className={styles.countdown}>
          <p className={styles.countdownPlaceholder}>— : — : —</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.topContent}>
      <h1 className={styles.title}>
        {closed ? 'The archive will open in:' : 'The archive is open.'}
      </h1>
      <Countdown
        closedHours={{
          startHour: CLOSED_START_HOUR,
          endHour: CLOSED_END_HOUR,
          ...(useTimezoneRedirect && CLOSED_TIMEZONE && { timeZone: CLOSED_TIMEZONE }),
        }}
      />
    </div>
  );
}
