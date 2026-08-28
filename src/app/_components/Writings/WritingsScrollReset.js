'use client';

import { useEffect } from 'react';

export default function WritingsScrollReset() {
  useEffect(() => {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    window.scrollTo(0, 0);
  }, []);

  return null;
}
