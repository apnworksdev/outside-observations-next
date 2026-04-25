import { NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';
import {
  ARCHIVE_PAGE_ENTRY_PREVIEW_PROJECTION,
  WIDLINE_CADET_QUERY,
} from '@/sanity/lib/queries';
import {
  toWidlineMediaItems,
  buildMergedFeedTokens,
} from '@/app/_data/archiveCollaborationFeed';

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 60;

function buildOrderClause(sortColumn, sortDirection) {
  const direction = sortDirection === 'asc' ? 'asc' : 'desc';

  if (sortColumn === 'year') {
    return `order(coalesce(metadata.year.value, year, -999999) ${direction}, _id asc)`;
  }

  if (sortColumn === 'artName') {
    return `order(lower(coalesce(metadata.artName, artName, "")) ${direction}, _id asc)`;
  }

  if (sortColumn === 'source') {
    return `order(lower(coalesce(metadata.source, source, "")) ${direction}, _id asc)`;
  }

  if (sortColumn === 'mediaType') {
    return `order(lower(coalesce(mediaType, "")) ${direction}, _id asc)`;
  }

  return 'order(_updatedAt desc, _id asc)';
}

function decodeCursor(cursorValue) {
  if (!cursorValue || typeof cursorValue !== 'string') {
    return null;
  }

  try {
    const decoded = Buffer.from(cursorValue, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function encodeCursor(payload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

function createSignature({ sortColumn, sortDirection, moodTags, searchIds }) {
  const sortedTags = [...moodTags].sort().join(',');
  const sortedSearchIds = [...searchIds].sort().join(',');
  return `${sortColumn || 'updated'}|${sortDirection || 'desc'}|${sortedTags}|${sortedSearchIds}`;
}

function normaliseEntry(entry) {
  if (!entry) {
    return entry;
  }

  if (entry.mediaType === 'visualEssay') {
    return {
      ...entry,
      visualEssayImages: entry.visualEssayPreviewImage ? [entry.visualEssayPreviewImage] : [],
    };
  }

  return {
    ...entry,
    visualEssayImages: [],
  };
}

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    const {
      cursor = null,
      limit: rawLimit = DEFAULT_LIMIT,
      sortColumn = null,
      sortDirection = null,
      searchIds: rawSearchIds = [],
      moodTags: rawMoodTags = [],
    } = body ?? {};

    const limit = Math.max(1, Math.min(MAX_LIMIT, Number(rawLimit) || DEFAULT_LIMIT));
    const searchIds = Array.isArray(rawSearchIds)
      ? rawSearchIds.filter((id) => typeof id === 'string' && id.trim().length > 0)
      : [];
    const moodTags = Array.isArray(rawMoodTags)
      ? rawMoodTags.filter((tag) => typeof tag === 'string' && tag.trim().length > 0)
      : [];

    const signature = createSignature({ sortColumn, sortDirection, moodTags, searchIds });
    const parsedCursor = decodeCursor(cursor);
    const cursorOffset =
      parsedCursor &&
      parsedCursor.signature === signature &&
      Number.isInteger(parsedCursor.offset) &&
      parsedCursor.offset >= 0
        ? parsedCursor.offset
        : 0;

    if (process.env.NODE_ENV !== 'production' && cursor && !parsedCursor) {
      console.warn('[archive/paginated] Invalid cursor payload, restarting from first page.');
    }
    if (
      process.env.NODE_ENV !== 'production' &&
      parsedCursor &&
      parsedCursor.signature !== signature
    ) {
      console.warn('[archive/paginated] Cursor signature mismatch, restarting from first page.');
    }

    const effectiveLimit = limit + 1;
    const orderClause = buildOrderClause(sortColumn, sortDirection);

    const baseFilter = `*[_type == "archiveEntry"
      && (!defined($hasSearchFilter) || !$hasSearchFilter || _id in $searchIds)
      && (!defined($hasMoodFilter) || !$hasMoodFilter || count((aiMoodTags[]->name)[@ in $moodTags]) > 0)
    ]`;

    const orderedIdsQuery = `${baseFilter} | ${orderClause}{ _id }`;

    const params = {
      hasSearchFilter: searchIds.length > 0,
      hasMoodFilter: moodTags.length > 0,
      searchIds,
      moodTags,
    };

    const [orderedIdRows, collaboration] = await Promise.all([
      client.fetch(orderedIdsQuery, params),
      client.fetch(WIDLINE_CADET_QUERY),
    ]);
    const orderedIds = Array.isArray(orderedIdRows)
      ? orderedIdRows.map((row) => row?._id).filter((id) => typeof id === 'string' && id.trim().length > 0)
      : [];

    const widlineItems = toWidlineMediaItems(collaboration);
    const mergedTokens = buildMergedFeedTokens(orderedIds, widlineItems, [
      collaboration?._id || 'widline-cadet',
      ...widlineItems.map((item) => item._id),
      signature,
    ]);

    const slice = mergedTokens.slice(cursorOffset, cursorOffset + effectiveLimit);
    const hasMore = slice.length > limit;
    const responseTokens = hasMore ? slice.slice(0, limit) : slice;
    const archiveIdsInPage = responseTokens
      .filter((token) => token.kind === 'archive')
      .map((token) => token.id);

    const archiveItems = archiveIdsInPage.length
      ? await client.fetch(
          `*[_type == "archiveEntry" && _id in $ids]{
            ${ARCHIVE_PAGE_ENTRY_PREVIEW_PROJECTION}
          }`,
          { ids: archiveIdsInPage }
        )
      : [];
    const archiveById = new Map(
      (Array.isArray(archiveItems) ? archiveItems : [])
        .map(normaliseEntry)
        .filter(Boolean)
        .map((item) => [item._id, item])
    );

    const responseItems = responseTokens
      .map((token) => {
        if (token.kind === 'widline') {
          return token.item;
        }
        return archiveById.get(token.id) || null;
      })
      .filter(Boolean);

    const nextOffset = cursorOffset + responseTokens.length;
    const nextCursor = hasMore ? encodeCursor({ offset: nextOffset, signature }) : null;

    return NextResponse.json({
      items: responseItems,
      hasMore,
      nextCursor,
      total: mergedTokens.length,
      limit,
    });
  } catch (error) {
    console.error('Failed to fetch paginated archive entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch paginated archive entries', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
