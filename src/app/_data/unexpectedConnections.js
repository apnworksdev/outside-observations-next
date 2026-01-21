'use server';

import { unstable_cache } from 'next/cache';
import { client } from '@/sanity/lib/client';
import {
  ARCHIVE_ENTRIES_ELIGIBLE_IDS_FOR_UNEXPECTED_QUERY,
  VISUAL_ESSAY_IMAGES_ELIGIBLE_IDS_FOR_UNEXPECTED_QUERY,
  ARCHIVE_ENTRIES_BY_IDS_FOR_UNEXPECTED_QUERY,
  VISUAL_ESSAY_IMAGES_BY_IDS_FOR_UNEXPECTED_QUERY,
  PARENT_ARCHIVE_FOR_VISUAL_ESSAY_IMAGE_QUERY,
} from '@/sanity/lib/queries';

/**
 * Fetches the pool of eligible IDs (archive + visual essay images) and caches it for 5 minutes.
 * All eligibility (including length(aiDescription) > 0) is enforced in GROQ; only _id and _type are fetched.
 */
async function fetchPoolUncached() {
  const [archive, visual] = await Promise.all([
    client.fetch(ARCHIVE_ENTRIES_ELIGIBLE_IDS_FOR_UNEXPECTED_QUERY),
    client.fetch(VISUAL_ESSAY_IMAGES_ELIGIBLE_IDS_FOR_UNEXPECTED_QUERY),
  ]);
  const a = Array.isArray(archive) ? archive : [];
  const v = Array.isArray(visual) ? visual : [];
  return [
    ...a.map((d) => ({ _id: d._id, _type: 'archiveEntry' })),
    ...v.map((d) => ({ _id: d._id, _type: 'visualEssayImage' })),
  ];
}

const getUnexpectedConnectionsPool = unstable_cache(
  fetchPoolUncached,
  ['unexpected-connections-pool'],
  { revalidate: 300 }
);

/**
 * Finds the parent visualEssay archive entry and the index of this image in it
 * (same filter as ArchiveEntryContent: image?.image?.asset). Returns { slug, imageIndex } or null.
 */
async function getParentArchiveForVisualEssayImage(visualId) {
  const parent = await client.fetch(PARENT_ARCHIVE_FOR_VISUAL_ESSAY_IMAGE_QUERY, { visualId });
  if (!parent?.slug) return null;
  const arr = parent.visualEssayImages || [];
  const validImages = arr.filter((ve) => ve?.image?.asset);
  const imageIndex = validImages.findIndex((ve) => ve._id === visualId);
  if (imageIndex < 0) return { slug: parent.slug, imageIndex: 0 };
  return { slug: parent.slug, imageIndex };
}

/**
 * Picks 2 random items from the cached pool, fetches only those 2 in full, and returns
 * { preparedItems, comparisonPayload }.
 */
export async function getTwoRandomForUnexpectedConnections(opts = {}) {
  const mediaWidth = typeof opts.mediaWidth === 'number' ? opts.mediaWidth : 600;

  try {
    const pool = await getUnexpectedConnectionsPool();

    if (!Array.isArray(pool) || pool.length === 0) {
      return { preparedItems: [], comparisonPayload: null };
    }

    const count = Math.min(2, pool.length);
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const picked = shuffled.slice(0, count);

    const archiveIds = picked.filter((p) => p._type === 'archiveEntry').map((p) => p._id);
    const visualIds = picked.filter((p) => p._type === 'visualEssayImage').map((p) => p._id);

    const [archiveEntries, visualEssayImages] = await Promise.all([
      archiveIds.length > 0
        ? client.fetch(ARCHIVE_ENTRIES_BY_IDS_FOR_UNEXPECTED_QUERY, { ids: archiveIds })
        : [],
      visualIds.length > 0
        ? client.fetch(VISUAL_ESSAY_IMAGES_BY_IDS_FOR_UNEXPECTED_QUERY, { ids: visualIds })
        : [],
    ]);

    const byId = {};
    (Array.isArray(archiveEntries) ? archiveEntries : []).forEach((d) => {
      byId[d._id] = { ...d, _type: 'archiveEntry' };
    });
    (Array.isArray(visualEssayImages) ? visualEssayImages : []).forEach((d) => {
      byId[d._id] = { ...d, _type: 'visualEssayImage' };
    });

    const ordered = picked.map((p) => byId[p._id]).filter(Boolean);

    const parentMap = {};
    await Promise.all(
      visualIds.map(async (id) => {
        const p = await getParentArchiveForVisualEssayImage(id);
        if (p) parentMap[id] = p;
      })
    );

    const preparedItems = ordered.map((doc) => {
      const isVisual = doc._type === 'visualEssayImage';
      const entry = isVisual
        ? { ...doc, poster: doc.image, artName: doc.metadata?.artName }
        : { ...doc };
      const displayImage = entry.poster || entry.image;
      const aspectRatio = displayImage?.dimensions?.aspectRatio ?? 1;
      const calculatedHeight = Math.round(mediaWidth / aspectRatio);
      const tags = entry.aiMoodTags || entry.metadata?.tags || entry.tags || [];
      const moodTags = (Array.isArray(tags) ? tags : [])
        .map((t) => (t && typeof t === 'object' && t.name) || (typeof t === 'string' ? t : null))
        .filter(Boolean);
      const description =
        typeof entry.aiDescription === 'string' && entry.aiDescription.trim().length > 0
          ? entry.aiDescription.trim()
          : null;

      let href = null;
      if (isVisual) {
        const p = parentMap[entry._id];
        href = p?.slug ? `/archive/entry/${p.slug}?image=${p.imageIndex}` : '/archive';
      } else {
        const slug = entry.metadata?.slug?.current ?? entry.slug?.current;
        href = slug ? `/archive/entry/${slug}` : null;
      }

      return { entry, calculatedHeight, moodTags, description, href };
    });

    const comparisonPayload =
      preparedItems.length >= 2
        ? {
            item1: {
              id: preparedItems[0].entry._id,
              name:
                preparedItems[0].entry.metadata?.artName ||
                preparedItems[0].entry.artName ||
                'Archive Entry',
              description:
                preparedItems[0].description ??
                `Archive entry ${preparedItems[0].entry.metadata?.artName || preparedItems[0].entry.artName || preparedItems[0].entry._id}`,
              mood_tags: preparedItems[0].moodTags,
            },
            item2: {
              id: preparedItems[1].entry._id,
              name:
                preparedItems[1].entry.metadata?.artName ||
                preparedItems[1].entry.artName ||
                'Archive Entry',
              description:
                preparedItems[1].description ??
                `Archive entry ${preparedItems[1].entry.metadata?.artName || preparedItems[1].entry.artName || preparedItems[1].entry._id}`,
              mood_tags: preparedItems[1].moodTags,
            },
          }
        : null;

    return { preparedItems, comparisonPayload };
  } catch (err) {
    console.error('getTwoRandomForUnexpectedConnections failed:', err);
    return { preparedItems: [], comparisonPayload: null };
  }
}
