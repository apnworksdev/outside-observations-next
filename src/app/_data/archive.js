'use server';

import { unstable_cache } from 'next/cache';

import { client } from '@/sanity/lib/client';
import { ARCHIVE_ENTRIES_QUERY } from '@/sanity/lib/queries';

export const getArchiveEntries = unstable_cache(
  async () => client.fetch(ARCHIVE_ENTRIES_QUERY),
  ['archive-entries'],
  { revalidate: 60 }
);

export async function getArchiveEntriesWithPosters() {
  const entries = await getArchiveEntries();
  return entries.filter((entry) => entry?.poster?.asset?._ref);
}

export async function getRandomArchivePosters(count = 2) {
  const entriesWithPosters = await getArchiveEntriesWithPosters();

  if (entriesWithPosters.length <= count) {
    return entriesWithPosters;
  }

  const shuffled = [...entriesWithPosters].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

