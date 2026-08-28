'use client';

import { useEffect } from 'react';

/**
 * On the writings pages the scroll container is <body> (overflow: hidden auto
 * in globals.css), not the window -- so Next's automatic scroll-to-top on
 * navigation has no effect and the listing inherited the article's scroll
 * position. This resets every scroller that could be holding it.
 */
export default function WritingsScrollReset() {
  useEffect(() => {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    window.scrollTo(0, 0);
  }, []);

  return null;
}
