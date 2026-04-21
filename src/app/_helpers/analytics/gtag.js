/**
 * Google Analytics helper barrel.
 * Keeps the public API stable while implementation lives in focused modules.
 */

export {
  COOKIE_CONSENT_ANALYTICS_KEY,
  GA4_MEASUREMENT_ID,
  gtag,
  trackEvent,
  trackPageSection,
  updateAnalyticsConsent,
} from './gtagCore';

export {
  trackMenuOpen,
  trackMenuClose,
  trackMenuItemClick,
  trackMoodSelect,
  trackUnexpectedConnectionsView,
  trackUnexpectedConnectionsRefresh,
  trackChatPanelOpen,
  trackChatMessageSent,
  trackArchiveViewSwitch,
  trackArchiveLoaded,
  trackArchiveEntryClick,
  trackArchiveEntryClickFromEntry,
  trackNavClick,
  trackRadioOpen,
  trackRadioClose,
  trackRadioExpand,
  trackOutboundClick,
  trackLabSubmitProposalClick,
  trackFirstVisitAnimationComplete,
  trackFirstVisitAnimationSkip,
  trackArchiveSort,
  trackVideoPlay,
  trackVideoPause,
  trackVideoComplete,
  trackChatExploreArchiveClick,
  trackContentWarningConsent,
  trackArchiveFiltersClear,
  trackVideoFullscreen,
  trackVisualEssayEntryAtImage,
  trackUnexpectedConnectionsEntryClick,
  trackHelpOpen,
  trackArchiveClosedView,
} from './gtagEvents';
