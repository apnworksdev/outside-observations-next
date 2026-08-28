import { getLocalStorage, setLocalStorage } from './localStorage';

/**
 * Per-article reading progress, stored locally (per browser, per device).
 * One map under a single key: { [slug]: highest percentage reached }.
 */
const STORAGE_KEY = 'outside-observations-writings-progress';

/** Below this, an article only glanced at still counts as unread. */
export const MIN_MEANINGFUL_PROGRESS = 5;
/** From here on, the article counts as finished. */
export const DONE_THRESHOLD = 90;

/* In-memory write-through cache: saveReadingProgress is called from a scroll
   handler, and parsing JSON on every scroll tick would be wasted work. */
let cache = null;

function readAll() {
  if (cache) return cache;
  try {
    const raw = getLocalStorage(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    cache = parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    cache = {};
  }
  return cache;
}

export function getReadingProgress(slug) {
  if (!slug) return null;
  const value = readAll()[slug];
  return Number.isFinite(value) ? value : null;
}

/** Keeps the highest value ever reached: progress never regresses. */
export function saveReadingProgress(slug, percent) {
  if (!slug || !Number.isFinite(percent)) return;
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const all = readAll();
  if ((all[slug] ?? 0) >= clamped) return;
  all[slug] = clamped;
  try {
    setLocalStorage(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Storage unavailable: reading works fine without a bookmark.
  }
}
