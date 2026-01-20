'use client';

import { useEffect } from 'react';

/**
 * Find the nearest horizontal scroll container (overflow-x auto/scroll and scrollWidth > clientWidth).
 */
function findHorizontalScrollParent(el) {
  let parent = el.parentElement;
  while (parent) {
    const { overflowX, overflow } = getComputedStyle(parent);
    const canScrollX = parent.scrollWidth > parent.clientWidth;
    const scrollable = overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay' ||
      overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay';
    if (canScrollX && scrollable) return parent;
    parent = parent.parentElement;
  }
  return null;
}

/**
 * Client component that scrolls to a specific visual essay image on mount.
 * Used when navigating from the archive with ?image=N to open the entry at that image.
 * Centers the image horizontally in the scroll strip by computing scrollLeft on the scroll container.
 */
export default function ScrollToVisualEssayImage({ imageIndex }) {
  useEffect(() => {
    if (imageIndex == null || !Number.isFinite(imageIndex) || imageIndex < 0) {
      return;
    }
    const el = document.getElementById(`ve-image-${imageIndex}`);
    if (!el) return;

    const scroll = () => {
      if (!el.isConnected) return;
      const parent = findHorizontalScrollParent(el);
      if (parent) {
        const elRect = el.getBoundingClientRect();
        const parentRect = parent.getBoundingClientRect();
        const elementLeftInContent = parent.scrollLeft + (elRect.left - parentRect.left);
        const targetScrollLeft = elementLeftInContent + (elRect.width / 2) - (parent.clientWidth / 2);
        const maxScroll = Math.max(0, parent.scrollWidth - parent.clientWidth);
        const clamped = Math.max(0, Math.min(maxScroll, targetScrollLeft));
        if (!Number.isFinite(clamped)) return;
        parent.scrollTo({ left: clamped, behavior: 'smooth' });
      } else {
        el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    };

    // Defer until after layout/paint so dimensions are final (including after image load)
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(scroll);
    });
    return () => cancelAnimationFrame(raf);
  }, [imageIndex]);

  return null;
}
