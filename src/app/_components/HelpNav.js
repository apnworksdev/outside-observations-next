'use client';

import { useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';

import styles from '@app/_assets/nav.module.css';

export default function HelpNav() {
  const [isHelpNavOpen, setIsHelpNavOpen] = useState(false);
  const helpNavTextRef = useRef(null);
  const helpNavRef = useRef(null);

  useEffect(() => {
    if (!helpNavTextRef.current || !helpNavRef.current) return;

    if (isHelpNavOpen) {
      // Open animation - animate max-width to allow text to expand and wrap
      // Account for button width and gap, so text can use most of the 300px container
      gsap.to(helpNavTextRef.current, {
        maxWidth: '300px',
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
      });
    } else {
      // Close animation
      gsap.to(helpNavTextRef.current, {
        maxWidth: '0px',
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
      });
    }
  }, [isHelpNavOpen]);

  const handleHelpNavToggle = () => {
    setIsHelpNavOpen(!isHelpNavOpen);
  };

  return (
    <div 
      className={styles.helpNav} 
      ref={helpNavRef}
      data-open={isHelpNavOpen}
    >
      <p className={styles.helpNavText} ref={helpNavTextRef}>
        This archive is presented for educational and research purposes only. Please contact contact@outsideobservations.com if you would like your content removed.
      </p>
      <button 
        className={styles.helpNavButton} 
        type="button"
        onClick={handleHelpNavToggle}
        aria-label={isHelpNavOpen ? 'Close help' : 'Open help'}
      >
        {isHelpNavOpen ? 'X' : '?'}
      </button>
    </div>
  );
}

