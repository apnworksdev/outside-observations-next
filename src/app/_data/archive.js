'use server';

import { unstable_cache } from 'next/cache';

import { client } from '@/sanity/lib/client';
import {
  ARCHIVE_PAGE_ENTRIES_QUERY,
  ARCHIVE_ENTRIES_QUERY,
  SITE_SETTINGS_QUERY,
  WIDLINE_CADET_QUERY,
} from '@/sanity/lib/queries';
import {
  toWidlineMediaItems,
  mergeEntriesWithWidline,
} from '@/app/_data/archiveCollaborationFeed';

/**
 * Fetches archive entries for list view (optimized - lighter payload)
 * Returns empty array on error to prevent page crashes
 */
const fetchArchiveEntries = async () => {
  try {
    const [entries, collaboration] = await Promise.all([
      client.fetch(ARCHIVE_PAGE_ENTRIES_QUERY),
      client.fetch(WIDLINE_CADET_QUERY),
    ]);
    
    // Validate response is an array
    if (!Array.isArray(entries)) {
      console.error('getArchiveEntries: Expected array, got:', typeof entries);
      return [];
    }
    
    const widlineItems = toWidlineMediaItems(collaboration);
    return mergeEntriesWithWidline(entries, widlineItems, [
      collaboration?._id || 'widline-cadet',
      ...(widlineItems.map((item) => item._id)),
    ]);
  } catch (error) {
    console.error('Failed to fetch archive entries:', error);
    // Return empty array instead of throwing to prevent page crashes
    // Components should handle empty arrays gracefully
    return [];
  }
};

/**
 * Fetches full archive entries (with all data - for pages that need it)
 */
const fetchFullArchiveEntries = async () => {
  try {
    const entries = await client.fetch(ARCHIVE_ENTRIES_QUERY);
    
    // Validate response is an array
    if (!Array.isArray(entries)) {
      console.error('getFullArchiveEntries: Expected array, got:', typeof entries);
      return [];
    }
    
    return entries;
  } catch (error) {
    console.error('Failed to fetch full archive entries:', error);
    return [];
  }
};

const getArchiveEntriesCached = unstable_cache(
  fetchArchiveEntries,
  ['archive-entries-page-v3'],
  { revalidate: 60 }
);

/**
 * Archive page entries with safe cache fallback.
 * If payload grows beyond Next data-cache limits, fall back to uncached fetch
 * rather than throwing and breaking the page.
 */
export async function getArchiveEntries() {
  try {
    return await getArchiveEntriesCached();
  } catch (error) {
    const message = error?.message || '';
    const isCacheSizeError =
      message.includes('items over 2MB can not be cached') ||
      message.includes('Failed to set Next.js data cache');

    if (isCacheSizeError) {
      console.warn('Archive entries exceeded Next cache size; using uncached fallback.');
      return fetchArchiveEntries();
    }

    throw error;
  }
}

export const getFullArchiveEntries = fetchFullArchiveEntries;

/**
 * Fetches site settings with error handling
 * Returns null on error to allow pages to use defaults
 */
const fetchSiteSettings = async () => {
  try {
    const settings = await client.fetch(SITE_SETTINGS_QUERY);
    return settings;
  } catch (error) {
    console.error('Failed to fetch site settings:', error);
    // Return null instead of throwing - pages can use default values
    return null;
  }
};

export const getSiteSettings = unstable_cache(
  fetchSiteSettings,
  ['site-settings'],
  { revalidate: 60 }
);

/**
 * Gets archive entries that have posters
 * Handles errors gracefully
 */
export async function getArchiveEntriesWithPosters() {
  try {
    const entries = await getArchiveEntries();
    
    if (!Array.isArray(entries)) {
      return [];
    }
    
    return entries.filter((entry) => entry?.poster?.asset?._ref);
  } catch (error) {
    console.error('Failed to get archive entries with posters:', error);
    return [];
  }
}

/**
 * Gets random archive posters
 * Handles errors and edge cases gracefully
 */
export async function getRandomArchivePosters(count = 2) {
  try {
    if (typeof count !== 'number' || count < 1) {
      console.warn('getRandomArchivePosters: Invalid count, using default of 2');
      count = 2;
    }

    const entriesWithPosters = await getArchiveEntriesWithPosters();

    if (!Array.isArray(entriesWithPosters) || entriesWithPosters.length === 0) {
      return [];
    }

    if (entriesWithPosters.length <= count) {
      return entriesWithPosters;
    }

    // Fisher-Yates shuffle (more reliable than sort with Math.random)
    const shuffled = [...entriesWithPosters];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled.slice(0, count);
  } catch (error) {
    console.error('Failed to get random archive posters:', error);
    return [];
  }
}

