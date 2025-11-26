import { NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';
import { ARCHIVE_ENTRIES_BY_IDS_QUERY } from '@/sanity/lib/queries';

/**
 * API route to fetch archive entries by IDs
 * Optimized for fetching only the data needed to display images
 * Used by ChatBox to fetch images without loading all archive entries
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { ids } = body;

    // Validate input
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids must be a non-empty array' },
        { status: 400 }
      );
    }

    // Filter out invalid IDs
    const validIds = ids.filter(
      (id) => id && typeof id === 'string' && id.trim().length > 0
    );

    if (validIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid IDs provided' },
        { status: 400 }
      );
    }

    // Limit to prevent abuse (max 20 entries at a time)
    const limitedIds = validIds.slice(0, 20);

    // Fetch entries from Sanity
    const entries = await client.fetch(ARCHIVE_ENTRIES_BY_IDS_QUERY, {
      ids: limitedIds,
    });

    // Validate response
    if (!Array.isArray(entries)) {
      console.error('ARCHIVE_ENTRIES_BY_IDS_QUERY returned non-array:', typeof entries);
      return NextResponse.json(
        { error: 'Invalid response from database' },
        { status: 500 }
      );
    }

    // Filter out entries without posters (needed for image display)
    const entriesWithPosters = entries.filter(
      (entry) => entry?.poster?.asset?._ref
    );

    return NextResponse.json({ entries: entriesWithPosters });
  } catch (error) {
    console.error('Failed to fetch archive entries by IDs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch archive entries', details: error.message },
      { status: 500 }
    );
  }
}

