import { getLocalStorage, setLocalStorage } from './localStorage';

const STORAGE_KEY = 'outside-observations-writings-progress';

export const MIN_MEANINGFUL_PROGRESS = 5;
export const DONE_THRESHOLD = 90;

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

export function saveReadingProgress(slug, percent) {
  if (!slug || !Number.isFinite(percent)) return;
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const all = readAll();
  if ((all[slug] ?? 0) >= clamped) return;
  all[slug] = clamped;
  try {
    setLocalStorage(STORAGE_KEY, JSON.stringify(all));
  } catch {
  }
}
