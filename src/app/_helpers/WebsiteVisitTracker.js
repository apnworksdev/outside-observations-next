'use client';

import { useEffect } from 'react';
import { markWebsiteAsVisited } from './visitTracker';

/**
 * WebsiteVisitTracker - Marks the website as visited on any page load
 * 
 * This component runs on every page and marks that the user has visited
 * the website. This ensures that the first-visit animation on the home page
 * only shows if the home page is the first page the user visits.
 */
export default function WebsiteVisitTracker() {
  useEffect(() => {
    // Mark website as visited on any page load
    markWebsiteAsVisited();
  }, []);

  return null;
}
