/**
 * Google Analytics (GA4) helper.
 * Use these functions after the gtag script has loaded (e.g. in client components).
 * Event names and params are chosen for clear reporting in GA4 (Explorations, custom dimensions).
 */

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

/**
 * Send a custom event to GA4.
 * @param {string} eventName
 * @param {Record<string, string|number|boolean|undefined>} [params]
 */
export function trackEvent(eventName, params = {}) {
  const safe = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
  );
  gtag('event', eventName, safe);
}

// --- Bottom-right menu ---
export function trackMenuOpen() {
  trackEvent('menu_open');
}

export function trackMenuClose() {
  trackEvent('menu_close');
}

/** @param {'chat'|'mood'|'unexpected'|'live'} menuItem */
export function trackMenuItemClick(menuItem) {
  trackEvent('menu_item_click', { menu_item: menuItem });
}

// --- Mood panel ---
/** @param {string} mood */
export function trackMoodSelect(mood) {
  trackEvent('mood_select', { mood });
}

// --- Unexpected Connections ---
export function trackUnexpectedConnectionsView() {
  trackEvent('unexpected_connections_view');
}

export function trackUnexpectedConnectionsRefresh() {
  trackEvent('unexpected_connections_refresh');
}

// --- Chat ---
/** @param {'home'|'archive'} context */
export function trackChatPanelOpen(context) {
  trackEvent('chat_panel_open', { context });
}

/**
 * User sent a message. Sends truncated text for keyword analysis (privacy-friendly).
 * @param {string} messageText - Raw message (will be truncated for storage)
 * @param {'home'|'archive'} variant
 * @param {number} [wordCount]
 */
export function trackChatMessageSent(messageText, variant, wordCount) {
  const truncated =
    typeof messageText === 'string' && messageText.length > 200
      ? messageText.slice(0, 200) + '…'
      : messageText;
  trackEvent('chat_message_sent', {
    variant,
    message_length: typeof messageText === 'string' ? messageText.length : 0,
    word_count: wordCount ?? (typeof messageText === 'string' ? messageText.trim().split(/\s+/).filter(Boolean).length : 0),
    // For "what are people saying" — use first 100 chars as keyword hint; avoid PII
    message_preview: typeof truncated === 'string' ? truncated.slice(0, 100) : '',
  });
}

// --- Archive view ---
/** @param {'list'|'images'} view */
export function trackArchiveViewSwitch(view) {
  trackEvent('archive_view_switch', { view });
}

/**
 * Archive page loaded with a view. Use for "list vs images" usage (which view is used most).
 * Fire once when archive list mounts with current view.
 * @param {'list'|'images'} view
 */
export function trackArchiveLoaded(view) {
  trackEvent('archive_loaded', { view });
}

/**
 * User clicked an archive entry (from list or images view). Use for most-visited entries.
 * No-op if entry slug is missing (avoids noisy empty events).
 *
 * @param {string} entrySlug - Entry slug (for breakdown in GA4)
 * @param {'list'|'images'} view - Which view they were in when clicking
 * @param {string} [entryType] - mediaType: 'video' | 'visualEssay' | 'image'
 * @param {boolean} [fromSearch]
 * @param {string} [searchQuery] - Truncated to 80 chars in event
 */
export function trackArchiveEntryClick(entrySlug, view, entryType, fromSearch, searchQuery) {
  if (!entrySlug) return;

  trackEvent('archive_entry_click', {
    entry_slug: entrySlug,
    view: view || 'images',
    entry_type: entryType || 'image',
    from_search: !!fromSearch,
    ...(searchQuery != null && searchQuery !== '' && { search_query: String(searchQuery).slice(0, 80) }),
  });
}

/**
 * Convenience helper: track archive entry click from entry object and search state.
 * Use in archive list (images) and list row so slug/query logic lives in one place.
 *
 * @param {{ metadata?: { slug?: { current?: string } }, slug?: { current?: string }, mediaType?: string }} entry
 * @param {'list'|'images'} [view]
 * @param {{ query?: string | null }} [searchStatus]
 */
export function trackArchiveEntryClickFromEntry(entry, view, searchStatus) {
  const slugValue = entry?.metadata?.slug?.current ?? entry?.slug?.current ?? '';
  const query = searchStatus?.query;
  trackArchiveEntryClick(
    slugValue,
    view,
    entry?.mediaType || 'image',
    !!query,
    query != null && query !== '' ? String(query).slice(0, 80) : undefined
  );
}

// --- Nav (header) ---
/**
 * @param {string} section - e.g. 'logo' | 'archive' | 'lab' | 'radio' | 'shop' | 'back_to_archive'
 * @param {'same_page'|'external'} destination
 */
export function trackNavClick(section, destination) {
  trackEvent('nav_click', { section, destination });
}

// --- Radio (iframe) ---
export function trackRadioOpen() {
  trackEvent('radio_open');
}

export function trackRadioClose() {
  trackEvent('radio_close');
}

export function trackRadioExpand() {
  trackEvent('radio_expand');
}

// --- Outbound ---
/**
 * @param {string} linkName - e.g. 'shop' | 'radio'
 * @param {string} url - Full URL (for debugging; GA4 may truncate)
 */
export function trackOutboundClick(linkName, url) {
  trackEvent('outbound_click', { link_name: linkName, outbound_url: url });
}

// --- Lab ---
export function trackLabSubmitProposalClick() {
  trackEvent('lab_submit_proposal_click');
}

// --- First-visit animation ---
export function trackFirstVisitAnimationComplete() {
  trackEvent('first_visit_animation_complete');
}

export function trackFirstVisitAnimationSkip() {
  trackEvent('first_visit_animation_skip');
}

// --- Archive sort (list view) ---
/**
 * @param {string} column - e.g. 'year' | 'artName' | 'source' | 'mediaType'
 * @param {'asc'|'desc'} direction
 */
export function trackArchiveSort(column, direction) {
  trackEvent('archive_sort', { column, direction });
}

// --- Video (entry detail) ---
/**
 * @param {string} entrySlug - Which entry (for “most played” in GA4)
 */
export function trackVideoPlay(entrySlug) {
  if (entrySlug) trackEvent('video_play', { entry_slug: entrySlug, context: 'entry_detail' });
}

/**
 * @param {string} entrySlug
 */
export function trackVideoPause(entrySlug) {
  if (entrySlug) trackEvent('video_pause', { entry_slug: entrySlug, context: 'entry_detail' });
}

/**
 * @param {string} entrySlug
 */
export function trackVideoComplete(entrySlug) {
  if (entrySlug) trackEvent('video_complete', { entry_slug: entrySlug, context: 'entry_detail' });
}

// --- Chat → Archive ---
/**
 * @param {number} resultsCount
 * @param {string} [searchQuery] - Truncated to 80 chars
 */
export function trackChatExploreArchiveClick(resultsCount, searchQuery) {
  trackEvent('chat_explore_archive_click', {
    results_count: resultsCount,
    ...(searchQuery != null && searchQuery !== '' && { search_query: String(searchQuery).slice(0, 80) }),
  });
}

// --- Content warning ---
export function trackContentWarningConsent() {
  trackEvent('content_warning_consent');
}

// --- Archive filters clear ---
/**
 * @param {boolean} [hadSearch]
 * @param {boolean} [hadMood]
 */
export function trackArchiveFiltersClear(hadSearch, hadMood) {
  trackEvent('archive_filters_clear', { had_search: !!hadSearch, had_mood: !!hadMood });
}

// --- Video fullscreen ---
/**
 * @param {string} entrySlug
 * @param {'enter'|'exit'} action
 */
export function trackVideoFullscreen(entrySlug, action) {
  if (entrySlug) trackEvent('video_fullscreen', { entry_slug: entrySlug, action });
}

// --- Visual essay deep link ---
/**
 * @param {string} entrySlug
 * @param {number} imageIndex
 */
export function trackVisualEssayEntryAtImage(entrySlug, imageIndex) {
  if (entrySlug && Number.isFinite(imageIndex) && imageIndex >= 0) {
    trackEvent('visual_essay_entry_at_image', { entry_slug: entrySlug, image_index: imageIndex });
  }
}

// --- Unexpected Connections entry click ---
/**
 * @param {string} entrySlug
 * @param {number} position - 1 or 2 (which of the two items)
 */
export function trackUnexpectedConnectionsEntryClick(entrySlug, position) {
  if (entrySlug) trackEvent('unexpected_connections_entry_click', { entry_slug: entrySlug, position });
}

// --- Help (?) open ---
export function trackHelpOpen() {
  trackEvent('help_open');
}

// --- Archive closed page ---
export function trackArchiveClosedView() {
  trackEvent('archive_closed_view');
}

// --- Page section & entry point (for entry/exit and "time by section") ---
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

/**
 * Call on route change. Sends page_section for current page; on first hit in session also sends entry_point.
 *
 * @param {string} pathname - Current pathname (e.g. from usePathname())
 */
export function trackPageSection(pathname) {
  const section = getSectionFromPathname(pathname);
  const params = { page_section: section };

  try {
    // entry_point only on first hit per session (sessionStorage can throw in private mode)
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

/**
 * Update GA4 consent state (Consent Mode). Call after user accepts or rejects analytics cookies.
 * @param {boolean} granted - true to allow analytics cookies, false to deny
 */
export function updateAnalyticsConsent(granted) {
  gtag('consent', 'update', { analytics_storage: granted ? 'granted' : 'denied' });
}

export { GA4_MEASUREMENT_ID };
