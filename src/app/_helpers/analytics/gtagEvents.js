import { trackEvent } from './gtagCore';

export function trackMenuOpen() { trackEvent('menu_open'); }
export function trackMenuClose() { trackEvent('menu_close'); }
export function trackMenuItemClick(menuItem) { trackEvent('menu_item_click', { menu_item: menuItem }); }
export function trackMoodSelect(mood) { trackEvent('mood_select', { mood }); }
export function trackUnexpectedConnectionsView() { trackEvent('unexpected_connections_view'); }
export function trackUnexpectedConnectionsRefresh() { trackEvent('unexpected_connections_refresh'); }
export function trackChatPanelOpen(context) { trackEvent('chat_panel_open', { context }); }
export function trackArchiveViewSwitch(view) { trackEvent('archive_view_switch', { view }); }
export function trackArchiveLoaded(view) { trackEvent('archive_loaded', { view }); }
export function trackNavClick(section, destination) { trackEvent('nav_click', { section, destination }); }
export function trackRadioOpen() { trackEvent('radio_open'); }
export function trackRadioClose() { trackEvent('radio_close'); }
export function trackRadioExpand() { trackEvent('radio_expand'); }
export function trackOutboundClick(linkName, url) { trackEvent('outbound_click', { link_name: linkName, outbound_url: url }); }
export function trackLabSubmitProposalClick() { trackEvent('lab_submit_proposal_click'); }
export function trackFirstVisitAnimationComplete() { trackEvent('first_visit_animation_complete'); }
export function trackFirstVisitAnimationSkip() { trackEvent('first_visit_animation_skip'); }
export function trackArchiveSort(column, direction) { trackEvent('archive_sort', { column, direction }); }
export function trackContentWarningConsent() { trackEvent('content_warning_consent'); }
export function trackHelpOpen() { trackEvent('help_open'); }
export function trackArchiveClosedView() { trackEvent('archive_closed_view'); }

export function trackChatMessageSent(messageText, variant, wordCount) {
  const truncated =
    typeof messageText === 'string' && messageText.length > 200
      ? `${messageText.slice(0, 200)}…`
      : messageText;
  trackEvent('chat_message_sent', {
    variant,
    message_length: typeof messageText === 'string' ? messageText.length : 0,
    word_count: wordCount ?? (typeof messageText === 'string' ? messageText.trim().split(/\s+/).filter(Boolean).length : 0),
    message_preview: typeof truncated === 'string' ? truncated.slice(0, 100) : '',
  });
}

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

export function trackVideoPlay(entrySlug) {
  if (entrySlug) trackEvent('video_play', { entry_slug: entrySlug, context: 'entry_detail' });
}
export function trackVideoPause(entrySlug) {
  if (entrySlug) trackEvent('video_pause', { entry_slug: entrySlug, context: 'entry_detail' });
}
export function trackVideoComplete(entrySlug) {
  if (entrySlug) trackEvent('video_complete', { entry_slug: entrySlug, context: 'entry_detail' });
}
export function trackChatExploreArchiveClick(resultsCount, searchQuery) {
  trackEvent('chat_explore_archive_click', {
    results_count: resultsCount,
    ...(searchQuery != null && searchQuery !== '' && { search_query: String(searchQuery).slice(0, 80) }),
  });
}
export function trackArchiveFiltersClear(hadSearch, hadMood) {
  trackEvent('archive_filters_clear', { had_search: !!hadSearch, had_mood: !!hadMood });
}
export function trackVideoFullscreen(entrySlug, action) {
  if (entrySlug) trackEvent('video_fullscreen', { entry_slug: entrySlug, action });
}
export function trackVisualEssayEntryAtImage(entrySlug, imageIndex) {
  if (entrySlug && Number.isFinite(imageIndex) && imageIndex >= 0) {
    trackEvent('visual_essay_entry_at_image', { entry_slug: entrySlug, image_index: imageIndex });
  }
}
export function trackUnexpectedConnectionsEntryClick(entrySlug, position) {
  if (entrySlug) trackEvent('unexpected_connections_entry_click', { entry_slug: entrySlug, position });
}
