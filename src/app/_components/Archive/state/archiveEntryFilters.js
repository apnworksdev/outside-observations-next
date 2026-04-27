'use client';

function hasMedia(entry) {
  if (!entry) return false;

  const mediaType = entry.mediaType;

  if (mediaType === 'visualEssay') {
    const images = entry.visualEssayImages;
    if (!Array.isArray(images)) return false;
    return images.some((img) => img?.image?.asset?._ref);
  }

  if (mediaType === 'video') {
    const hasVideoSource = entry.video?.asset?.url || entry.vimeoUrl || entry.videoExcerptUrl;
    return hasVideoSource && entry.poster?.asset?._ref;
  }

  return entry.poster?.asset?._ref;
}

function normaliseYearValue(entry) {
  let year = entry?.metadata?.year ?? entry?.year;

  if (typeof year === 'object' && year !== null && year?.value !== undefined) {
    year = year.value;
  }

  if (year === null || year === undefined) {
    return null;
  }

  if (typeof year === 'number' && Number.isFinite(year)) {
    return year;
  }

  if (typeof year === 'string') {
    const trimmed = year.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = parseInt(trimmed, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }

    const yearMatch = trimmed.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      const extracted = parseInt(yearMatch[0], 10);
      if (!Number.isNaN(extracted)) {
        return extracted;
      }
    }
  }

  return null;
}

function normaliseStringValue(entry, key) {
  let value;
  if (key === 'artName' || key === 'fileName' || key === 'source') {
    value = entry?.metadata?.[key] || entry?.[key];
  } else {
    value = entry?.[key];
  }

  if (typeof value === 'string') {
    return value.trim().toLocaleLowerCase();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toString();
  }

  return value ?? '';
}

const SORT_ACCESSORS = {
  year: (entry) => normaliseYearValue(entry),
  artName: (entry) => normaliseStringValue(entry, 'artName'),
  fileName: (entry) => normaliseStringValue(entry, 'fileName'),
  source: (entry) => normaliseStringValue(entry, 'source'),
  mediaType: (entry) => normaliseStringValue(entry, 'mediaType'),
};

export function getInitialArchiveSorting() {
  return { column: null, direction: null };
}

function compareSortValues(valueA, valueB, isAscending) {
  const bothNumbers =
    typeof valueA === 'number' &&
    typeof valueB === 'number' &&
    Number.isFinite(valueA) &&
    Number.isFinite(valueB);

  if (bothNumbers) {
    return isAscending ? valueA - valueB : valueB - valueA;
  }

  const stringA = typeof valueA === 'string' ? valueA : valueA === null || valueA === undefined ? '' : String(valueA);
  const stringB = typeof valueB === 'string' ? valueB : valueB === null || valueB === undefined ? '' : String(valueB);

  const comparison = stringA.localeCompare(stringB, undefined, { sensitivity: 'base', numeric: true });
  return isAscending ? comparison : -comparison;
}

export function getFilteredArchiveEntries(entries, searchResults, selectedMoodTags) {
  let result = entries.filter(hasMedia);

  if (searchResults?.active) {
    const allowedIds = new Set(searchResults.ids);
    if (allowedIds.size === 0) {
      return [];
    }

    const rankList = searchResults.orderedIds ?? [];
    const rankMap = new Map();
    for (let index = 0; index < rankList.length; index += 1) {
      const id = rankList[index];
      if (!rankMap.has(id)) {
        rankMap.set(id, index);
      }
    }

    const getRankForEntry = (entry) => {
      if (!entry) {
        return Number.POSITIVE_INFINITY;
      }
      if (rankMap.has(entry._id)) {
        return rankMap.get(entry._id);
      }
      return Number.POSITIVE_INFINITY;
    };

    result = entries
      .filter((entry) => allowedIds.has(entry._id))
      .sort((a, b) => getRankForEntry(a) - getRankForEntry(b));
  }

  if (selectedMoodTags && selectedMoodTags.length > 0) {
    result = result.filter((entry) => {
      const moodTags = entry.aiMoodTags || [];
      return selectedMoodTags.some((selectedTag) => moodTags.some((tag) => tag?.name === selectedTag));
    });
  }

  return result;
}

export function getSortedArchiveEntries(filteredEntries, sorting) {
  const column = sorting?.column;
  const direction = sorting?.direction;

  if (!column || !direction) {
    return filteredEntries;
  }

  const accessor = SORT_ACCESSORS[column];
  if (typeof accessor !== 'function') {
    return filteredEntries;
  }

  const isAscending = direction === 'asc';
  const withMeta = filteredEntries.map((entry, index) => ({
    entry,
    index,
    value: accessor(entry),
  }));

  withMeta.sort((a, b) => {
    const valueA = a.value;
    const valueB = b.value;

    if (valueA === valueB) {
      return a.index - b.index;
    }
    if (valueA === null || valueA === undefined) {
      return isAscending ? 1 : -1;
    }
    if (valueB === null || valueB === undefined) {
      return isAscending ? -1 : 1;
    }

    const comparison = compareSortValues(valueA, valueB, isAscending);
    if (comparison === 0) {
      return a.index - b.index;
    }
    return comparison;
  });

  return withMeta.map((item) => item.entry);
}
