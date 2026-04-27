// Use NEXT_PUBLIC_GA4_MEASUREMENT_ID in .env.local to test a different property (e.g. on localhost).
const GA4_MEASUREMENT_ID =
  typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_GA4_MEASUREMENT_ID
    ? process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
    : 'G-28FFYLDLLZ';

/** localStorage key for cookie consent (must match value in layout.js consent script). */
export const COOKIE_CONSENT_ANALYTICS_KEY = 'cookie_consent_analytics';

export function gtag() {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag(...arguments);
  }
}

export function trackEvent(eventName, params = {}) {
  const safe = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
  );
  gtag('event', eventName, safe);
}

const SECTION_BY_PATH = {
  '/': 'home',
  '/archive': 'archive',
  '/lab': 'lab',
  '/archive/closed': 'archive_closed',
  '/archive/unexpected-connections': 'unexpected_connections',
};

function getSectionFromPathname(pathname) {
  if (!pathname) return 'other';
  const normalized = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  if (SECTION_BY_PATH[normalized]) return SECTION_BY_PATH[normalized];
  if (normalized.startsWith('/archive/entry/')) return 'archive_entry';
  return 'other';
}

const ENTRY_POINT_KEY = 'ga_entry_point_sent';

export function trackPageSection(pathname) {
  const section = getSectionFromPathname(pathname);
  const params = { page_section: section };

  try {
    if (typeof sessionStorage !== 'undefined') {
      const alreadySent = sessionStorage.getItem(ENTRY_POINT_KEY);
      if (!alreadySent) {
        params.entry_point = section;
        sessionStorage.setItem(ENTRY_POINT_KEY, '1');
      }
    }
  } catch {
    // Ignore (e.g. private browsing, storage full)
  }

  trackEvent('page_section', params);
}

export function updateAnalyticsConsent(granted) {
  gtag('consent', 'update', { analytics_storage: granted ? 'granted' : 'denied' });
}

export { GA4_MEASUREMENT_ID };
