'use client';

import { useLayoutEffect, useState } from 'react';
import FirstVisitAnimation from '@/app/_components/Home/FirstVisitAnimation';
import { isFirstWebsiteVisit, markWebsiteAsVisited } from '@/app/_helpers/tracking/websiteVisitState';
import styles from '@app/_assets/home/home.module.css';

export default function FirstVisitIntro() {
  const [phase, setPhase] = useState('unknown');

  useLayoutEffect(() => {
    const first = isFirstWebsiteVisit();
    if (!first) {
      document.documentElement.removeAttribute('data-intro');
    }
    setPhase(first ? 'playing' : 'done');
  }, []);

  const finish = () => {
    markWebsiteAsVisited();
    document.documentElement.removeAttribute('data-intro');
    setPhase('done');
  };

  if (phase !== 'playing') {
    return null;
  }

  return (
    <div className={styles.introOverlay}>
      <FirstVisitAnimation onComplete={finish} />
    </div>
  );
}
