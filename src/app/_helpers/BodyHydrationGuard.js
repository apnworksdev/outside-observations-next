'use client';

import { useLayoutEffect } from 'react';

/**
 * BodyHydrationGuard - Hides body content until React has hydrated and view preference is loaded.
 * This prevents layout flash when the archive view preference is restored from cookie.
 * Uses useLayoutEffect to run synchronously before paint.
 */
export default function BodyHydrationGuard() {
  useLayoutEffect(() => {
    // Wait one tick to ensure all useLayoutEffects have run (like the view preference update)
    // This ensures the correct view is set before showing the body
    requestAnimationFrame(() => {
      if (typeof document !== 'undefined' && document.body) {
        document.body.classList.add('hydrated');
      }
    });
  }, []);

  return null;
}
