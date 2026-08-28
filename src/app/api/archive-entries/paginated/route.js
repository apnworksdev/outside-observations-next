import { NextResponse } from 'next/server';
import { getPaginatedArchivePage } from '@/app/_data/getPaginatedArchivePage';

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    const {
      cursor = null,
      limit,
      sortColumn = null,
      sortDirection = null,
      searchIds = [],
      searchActive = false,
      moodTags = [],
    } = body ?? {};

    const result = await getPaginatedArchivePage({
      cursor,
      limit,
      sortColumn,
      sortDirection,
      searchIds,
      searchActive,
      moodTags,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch paginated archive entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch paginated archive entries', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
