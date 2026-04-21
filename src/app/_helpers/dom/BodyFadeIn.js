'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { resolvePageType } from '@/lib/resolvePageType';

export default function BodyFadeIn() {
  const pathname = usePathname();

  useEffect(() => {
    // Only apply fade-in on home page
    const pageType = resolvePageType(pathname);
    const isHomePage = pageType === 'home';
    
    if (isHomePage) {
      // Add blur-ready class to body after first render to trigger fade-in transition
      // Using requestAnimationFrame to ensure it happens after the initial paint
      requestAnimationFrame(() => {
        if (document.body) {
          document.body.classList.add('blur-ready');
        }
      });
    } else {
      // Remove blur-ready class when not on home page
      if (document.body) {
        document.body.classList.remove('blur-ready');
      }
    }
  }, [pathname]);

  return null;
}

