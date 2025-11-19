'use client';

import { useEffect } from 'react';

export default function BodyFadeIn() {
  useEffect(() => {
    // Only apply fade-in on home page
    const isHomePage = document.body.getAttribute('data-page') === 'home';
    if (!isHomePage) return;

    // Add blur-ready class to body after first render to trigger fade-in transition
    // Using requestAnimationFrame to ensure it happens after the initial paint
    requestAnimationFrame(() => {
      if (document.body) {
        document.body.classList.add('blur-ready');
      }
    });
  }, []);

  return null;
}

