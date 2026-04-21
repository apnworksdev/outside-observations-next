'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { markWebsiteAsVisited, isFirstWebsiteVisit } from './websiteVisitState';

/**
 * WebsiteVisitTracker - Marks the website as visited on any page load
 * 
 * This component runs on every page and marks that the user has visited
 * the website. This ensures that the first-visit animation on the home page
 * only shows if the home page is the first page the user visits.
 * 
 * Special handling: On the home page, we don't set localStorage immediately if
 * it's a first visit. This allows users who cleared storage to see the home page.
 * Local storage will be set when:
 * 1. The animation completes (handled in HomeContent)
 * 2. User navigates away from home (handled here when isHomePage is false)
 */
export default function WebsiteVisitTracker() {
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  useEffect(() => {
    if (isHomePage) {
      // On home page: only mark as visited if it's NOT a first visit
      // This allows users who deleted the cookie to see the home page
      // localStorage will be set when animation completes or when navigating away
      if (!isFirstWebsiteVisit()) {
        // Already visited - ensure localStorage is set
        markWebsiteAsVisited();
      }
      // If first visit, don't set localStorage yet - let them see home page
      return;
    }

    // On any other page, always mark as visited
    markWebsiteAsVisited();
  }, [isHomePage]);

  return null;
}
