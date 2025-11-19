'use client';

import { useEffect } from 'react';

export default function BodyFadeIn() {
  useEffect(() => {
    // Add blur-ready class to body after first render to trigger fade-in transition
    // Using requestAnimationFrame to ensure it happens after the initial paint
    requestAnimationFrame(() => {
      document.body.classList.add('blur-ready');
    });
  }, []);

  return null;
}

