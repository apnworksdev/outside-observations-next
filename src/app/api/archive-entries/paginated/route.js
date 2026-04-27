import { NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';
import {
  ARCHIVE_PAGE_ENTRY_PREVIEW_PROJECTION,
  WIDLINE_CADET_QUERY,
} from '@/sanity/lib/queries';
import {
  toWidlineMediaItems,
  getDeterministicSlots,
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

function countSlotsLessOrEqual(slots, value) {
  let left = 0;
  let right = slots.length;
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (slots[mid] <= value) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  return left;
}

function lowerBoundByPosition(archiveCount, slots, mergedPosition) {
  let left = 0;
  let right = archiveCount;
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    const position = mid + countSlotsLessOrEqual(slots, mid);
    if (position < mergedPosition) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  return left;
}

function buildMergedWindow({
  archiveCount,
  slots,
  widlineItems,
  offset,
  limit,
}) {
  const widlineCount = Math.min(widlineItems.length, slots.length);
  const totalMergedCount = archiveCount + widlineCount;
  const safeOffset = Math.max(0, Math.min(offset, totalMergedCount));
  const endExclusive = Math.min(totalMergedCount, safeOffset + limit);

  if (safeOffset >= endExclusive) {
    return {
      tokens: [],
      totalMergedCount,
      nextOffset: safeOffset,
      hasMore: false,
      archiveRangeStart: 0,
      archiveRangeEndExclusive: 0,
    };
  }

  const widlinePositions = slots.map((slot, idx) => slot + idx);
  let widlinePtr = 0;
  while (widlinePtr < widlinePositions.length && widlinePositions[widlinePtr] < safeOffset) {
    widlinePtr += 1;
  }

  let archiveIndex = lowerBoundByPosition(archiveCount, slots, safeOffset);
  const tokens = [];
  const archiveIndices = [];
  let position = safeOffset;

  while (position < endExclusive) {
    const nextWidlinePos =
      widlinePtr < widlinePositions.length ? widlinePositions[widlinePtr] : Number.POSITIVE_INFINITY;
    const nextArchivePos =
      archiveIndex < archiveCount
        ? archiveIndex + countSlotsLessOrEqual(slots, archiveIndex)
        : Number.POSITIVE_INFINITY;

    if (nextWidlinePos <= nextArchivePos) {
      const item = widlineItems[widlinePtr];
      if (item) {
        tokens.push({ kind: 'widline', item });
      }
      widlinePtr += 1;
      position += 1;
      continue;
    }

    if (archiveIndex < archiveCount) {
      tokens.push({ kind: 'archive', archiveIndex });
      archiveIndices.push(archiveIndex);
      archiveIndex += 1;
      position += 1;
      continue;
    }

    break;
  }

  const archiveRangeStart = archiveIndices.length > 0 ? archiveIndices[0] : 0;
  const archiveRangeEndExclusive =
    archiveIndices.length > 0 ? archiveIndices[archiveIndices.length - 1] + 1 : 0;
  const nextOffset = safeOffset + tokens.length;
  const hasMore = nextOffset < totalMergedCount;

  return {
    tokens,
    totalMergedCount,
    nextOffset,
    hasMore,
    archiveRangeStart,
    archiveRangeEndExclusive,
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

    const effectiveLimit = limit + 1;
    const orderClause = buildOrderClause(sortColumn, sortDirection);

    const baseFilter = `*[_type == "archiveEntry"
      && (!defined($hasSearchFilter) || !$hasSearchFilter || _id in $searchIds)
      && (!defined($hasMoodFilter) || !$hasMoodFilter || count((aiMoodTags[]->name)[@ in $moodTags]) > 0)
    ]`;

    const archiveCountQuery = `count(${baseFilter})`;

    const params = {
      hasSearchFilter: searchIds.length > 0,
      hasMoodFilter: moodTags.length > 0,
      searchIds,
      moodTags,
    };

    const [archiveCountRaw, collaboration] = await Promise.all([
      client.fetch(archiveCountQuery, params),
      client.fetch(WIDLINE_CADET_QUERY),
    ]);
    const archiveCount = Number.isFinite(Number(archiveCountRaw)) ? Number(archiveCountRaw) : 0;

    const widlineItems = toWidlineMediaItems(collaboration);
    const slots = getDeterministicSlots(archiveCount, widlineItems.length, [
      collaboration?._id || 'widline-cadet',
      ...widlineItems.map((item) => item._id),
      signature,
    ]);
    const windowResult = buildMergedWindow({
      archiveCount,
      slots,
      widlineItems,
      offset: cursorOffset,
      limit: effectiveLimit,
    });

    const pageTokens = windowResult.hasMore
      ? windowResult.tokens.slice(0, limit)
      : windowResult.tokens;

    const archiveItemsInRange =
      windowResult.archiveRangeEndExclusive > windowResult.archiveRangeStart
        ? await client.fetch(
            `${baseFilter} | ${orderClause}[${windowResult.archiveRangeStart}...${windowResult.archiveRangeEndExclusive}]{
              ${ARCHIVE_PAGE_ENTRY_PREVIEW_PROJECTION}
            }`,
            params
          )
        : [];
    const archiveItems = Array.isArray(archiveItemsInRange)
      ? archiveItemsInRange.map(normaliseEntry).filter(Boolean)
      : [];
    const archiveByRangeIndex = new Map(
      archiveItems.map((item, idx) => [windowResult.archiveRangeStart + idx, item])
    );

    const responseItems = pageTokens
      .map((token) => {
        if (token.kind === 'widline') {
          return token.item;
        }
        return archiveByRangeIndex.get(token.archiveIndex) || null;
      })
      .filter(Boolean);

    const nextOffset = cursorOffset + pageTokens.length;
    const hasMore = windowResult.hasMore && pageTokens.length > 0;
    const nextCursor = hasMore ? encodeCursor({ offset: nextOffset, signature }) : null;

    return NextResponse.json({
      items: responseItems,
      hasMore,
      nextCursor,
      total: windowResult.totalMergedCount,
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
