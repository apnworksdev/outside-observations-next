'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function StudioLayoutWrapper() {
  const pathname = usePathname();
  const isStudioRoute = pathname?.startsWith('/studio');

  useEffect(() => {
    const elements = document.querySelectorAll('[data-hide-on-studio="true"]');
    elements.forEach((el) => {
      if (isStudioRoute) {
        el.style.display = 'none';
      } else {
        el.style.display = '';
      }
    });
  }, [isStudioRoute]);

  return null;
}

