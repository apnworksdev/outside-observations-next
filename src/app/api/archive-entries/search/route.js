import { NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';
import { ARCHIVE_ENTRIES_TEXT_SEARCH_IDS_QUERY, MATCHING_TAG_IDS_QUERY } from '@/sanity/lib/queries';

const MAX_RESULTS = 60;
const MAX_QUERY_LENGTH = 120;

export async function POST(request) {
  try {
    const body = await request.json();
    const rawQuery = typeof body?.query === 'string' ? body.query.trim() : '';

    if (rawQuery.length === 0) {
      return NextResponse.json({ error: 'query must be a non-empty string' }, { status: 400 });
    }

    const term = `${rawQuery.slice(0, MAX_QUERY_LENGTH)}*`;

    const tagIdsRaw = await client.fetch(MATCHING_TAG_IDS_QUERY, { term });
    const tagIds = Array.isArray(tagIdsRaw) ? tagIdsRaw.filter(Boolean) : [];

    const results = await client.fetch(ARCHIVE_ENTRIES_TEXT_SEARCH_IDS_QUERY, {
      term,
      tagIds,
      limit: MAX_RESULTS,
    });

    if (!Array.isArray(results)) {
      console.error('ARCHIVE_ENTRIES_TEXT_SEARCH_IDS_QUERY returned non-array:', typeof results);
      return NextResponse.json({ error: 'Invalid response from database' }, { status: 500 });
    }

    const ids = results.map((entry) => entry?._id).filter(Boolean);

    return NextResponse.json({ ids, query: rawQuery });
  } catch (error) {
    console.error('Failed to run archive text search:', error);
    return NextResponse.json(
      { error: 'Failed to run archive text search', details: error.message },
      { status: 500 }
    );
  }
}
