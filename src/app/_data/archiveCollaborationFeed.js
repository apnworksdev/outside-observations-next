function hashStringSeed(input) {
  let hash = 0;
  const normalized = String(input || '');
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function createSeededRng(seedValue) {
  let state = seedValue % 2147483647;
  if (state <= 0) {
    state += 2147483646;
  }
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function toPosterFromImage(image) {
  if (!image?.asset) {
    return null;
  }
  return {
    asset: image.asset,
    crop: image.crop,
    hotspot: image.hotspot,
    lqip: image.lqip,
    dimensions: image.dimensions,
  };
}

export function toWidlineMediaItems(collaboration) {
  if (!collaboration) {
    return [];
  }

  const background = Array.isArray(collaboration.backgroundMedia) ? collaboration.backgroundMedia : [];
  const foreground = Array.isArray(collaboration.foregroundMedia) ? collaboration.foregroundMedia : [];
  const merged = [...background, ...foreground];

  return merged
    .map((item, index) => {
      const isVideo = item?.mediaType === 'video' && item?.video?.asset?.url;
      const poster = toPosterFromImage(item?.image);

      if (!poster) {
        return null;
      }

      const mediaType = isVideo ? 'video' : 'image';
      const stableId = item?._key || `widline-${mediaType}-${index}`;

      return {
        _id: `widline-media-${stableId}-${index}`,
        _type: 'widlineMedia',
        kind: 'widlineMedia',
        mediaType,
        poster,
        video: isVideo ? item.video : null,
        vimeoUrl: null,
        videoExcerptUrl: null,
        metadata: {
          artName:
            item?.title ||
            item?.alt ||
            item?.imageFileName ||
            `${collaboration.title || 'Widline Cadet'} ${index + 1}`,
          source: 'Widline Cadet',
          fileName: item?.imageFileName || `widline-cadet-${index + 1}`,
          year: item?.year ? { value: item.year } : null,
          contentWarning: false,
          tags: [],
        },
        aiMoodTags: [],
        widlineMediaIndex: index,
      };
    })
    .filter(Boolean);
}

function getDeterministicSlots(archiveCount, widlineCount, seedParts = []) {
  const insertionSlots = archiveCount + 1;
  const cappedWidlineCount = Math.min(widlineCount, insertionSlots);
  const seed = hashStringSeed(`${archiveCount}|${widlineCount}|${seedParts.join('|')}`);
  const random = createSeededRng(seed);
  const usedSlots = new Set();

  while (usedSlots.size < cappedWidlineCount) {
    const slot = Math.floor(random() * insertionSlots);
    usedSlots.add(slot);
  }

  return [...usedSlots].sort((a, b) => a - b);
}

export function mergeEntriesWithWidline(entries, widlineItems, seedParts = []) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return Array.isArray(widlineItems) ? widlineItems : [];
  }
  if (!Array.isArray(widlineItems) || widlineItems.length === 0) {
    return entries;
  }

  const slots = getDeterministicSlots(entries.length, widlineItems.length, seedParts);
  const slotToItems = new Map();
  slots.forEach((slot, idx) => {
    slotToItems.set(slot, widlineItems[idx]);
  });

  const merged = [];
  for (let i = 0; i <= entries.length; i += 1) {
    const injected = slotToItems.get(i);
    if (injected) {
      merged.push(injected);
    }
    if (i < entries.length) {
      merged.push(entries[i]);
    }
  }
  return merged;
}

export function buildMergedFeedTokens(orderedArchiveIds, widlineItems, seedParts = []) {
  const safeIds = Array.isArray(orderedArchiveIds) ? orderedArchiveIds : [];
  if (!Array.isArray(widlineItems) || widlineItems.length === 0) {
    return safeIds.map((id) => ({ kind: 'archive', id }));
  }

  const slots = getDeterministicSlots(safeIds.length, widlineItems.length, seedParts);
  const slotToItems = new Map();
  slots.forEach((slot, idx) => {
    slotToItems.set(slot, widlineItems[idx]);
  });

  const merged = [];
  for (let i = 0; i <= safeIds.length; i += 1) {
    const injected = slotToItems.get(i);
    if (injected) {
      merged.push({ kind: 'widline', item: injected });
    }
    if (i < safeIds.length) {
      merged.push({ kind: 'archive', id: safeIds[i] });
    }
  }
  return merged;
}
