# GA4 Analytics – Tracking & Setup Guide

This document describes all Google Analytics (GA4) events implemented on the site and the steps to configure GA4 and Search Console for reporting.

**Measurement ID:** `G-38CH7V80XK`

---

## 1. Events we send

All events are sent via the gtag helper (`src/app/_helpers/gtag.js`). GA4 automatically collects `page_view` and engagement; below are the **custom events** and their parameters.

### Bottom-right menu (archive)

| Event name | When | Parameters |
|------------|------|------------|
| `menu_open` | User opens the radial menu | — |
| `menu_close` | User closes the menu | — |
| `menu_item_click` | User clicks a menu item | `menu_item`: `chat` \| `mood` \| `unexpected` \| `live` |

### Chat panel

| Event name | When | Parameters |
|------------|------|------------|
| `chat_panel_open` | Chat panel is shown (home in-page or archive via menu) | `context`: `home` \| `archive` |
| `chat_message_sent` | User sends a message in chat | `variant`: `home` \| `archive`, `message_length`, `word_count`, `message_preview` (first 100 chars) |

### Mood (archive)

| Event name | When | Parameters |
|------------|------|------------|
| `mood_select` | User selects a mood tag in the Mood panel | `mood`: tag name (e.g. Calm, Quiet, Dream) |

### Unexpected Connections

| Event name | When | Parameters |
|------------|------|------------|
| `unexpected_connections_view` | User lands on the Unexpected Connections page | — |
| `unexpected_connections_refresh` | User clicks “Refresh” to get new pairs | — |
| `unexpected_connections_entry_click` | User clicks one of the two entries | `entry_slug`, `position`: `1` \| `2` |

### Archive list / view

| Event name | When | Parameters |
|------------|------|------------|
| `archive_loaded` | Archive page loads (once per visit) | `view`: `list` \| `images` |
| `archive_view_switch` | User switches between List and Images | `view`: `list` \| `images` |
| `archive_entry_click` | User clicks an entry (list or grid) | `entry_slug`, `view`, `entry_type`, `from_search`, `search_query` (optional, truncated) |
| `archive_sort` | User applies sort in list view | `column`: e.g. `year`, `artName`, `source`, `mediaType`; `direction`: `asc` \| `desc` |
| `archive_filters_clear` | User clicks “Clear” (search + mood) | `had_search`, `had_mood` (boolean) |

### Header navigation

| Event name | When | Parameters |
|------------|------|------------|
| `nav_click` | User clicks logo, Archive, Lab, Back, Shop | `section`: e.g. `logo`, `archive`, `lab`, `back_to_archive`, `shop`; `destination`: `same_page` \| `external` |
| `outbound_click` | User clicks an external link (e.g. Shop) | `link_name`, `outbound_url` |

### Radio (iframe)

| Event name | When | Parameters |
|------------|------|------------|
| `radio_open` | User opens the radio iframe from the nav | — |
| `radio_close` | User closes the radio from the pill | — |
| `radio_expand` | User expands the radio from minimized | — |

### Video (entry detail page)

| Event name | When | Parameters |
|------------|------|------------|
| `video_play` | Video starts playing | `entry_slug`, `context`: `entry_detail` |
| `video_pause` | Video is paused | `entry_slug`, `context`: `entry_detail` |
| `video_complete` | Video playback ends | `entry_slug`, `context`: `entry_detail` |
| `video_fullscreen` | User toggles fullscreen | `entry_slug`, `action`: `enter` \| `exit` |

### Visual essay

| Event name | When | Parameters |
|------------|------|------------|
| `visual_essay_entry_at_image` | Entry opened with `?image=N` (deep link) | `entry_slug`, `image_index` |

### Chat → Archive

| Event name | When | Parameters |
|------------|------|------------|
| `chat_explore_archive_click` | User clicks “Explore…” in chat to go to archive with results | `results_count`, `search_query` (optional, truncated) |

### Content warning

| Event name | When | Parameters |
|------------|------|------------|
| `content_warning_consent` | User clicks “Unlock” on sensitive content overlay | — |

### Lab

| Event name | When | Parameters |
|------------|------|------------|
| `lab_submit_proposal_click` | User clicks “Submit a proposal” (mailto) | — |

### First-visit (home)

| Event name | When | Parameters |
|------------|------|------------|
| `first_visit_animation_complete` | Home animation finishes | — |
| `first_visit_animation_skip` | User clicks “Skip animation” (error fallback) | — |

### Help

| Event name | When | Parameters |
|------------|------|------------|
| `help_open` | User opens the “?” help in archive nav | — |

### Archive closed page

| Event name | When | Parameters |
|------------|------|------------|
| `archive_closed_view` | User views the archive closed / countdown page | — |

### Section & entry point

| Event name | When | Parameters |
|------------|------|------------|
| `page_section` | Every route change | `page_section`: e.g. `home`, `archive`, `archive_entry`, `lab`, `unexpected_connections`, `archive_closed`, `other` |
| *(same event, first hit only)* | First hit of the session | `entry_point`: same value as `page_section` for that hit |

---

## 2. What to do in Google Analytics (GA4)

### 2.1 Link Search Console (recommended)

1. In **GA4**, go to **Admin** (gear, bottom left).
2. Under **Product links**, open **Search Console links**.
3. Click **Link** and follow the steps to connect your Search Console property.
4. After linking, use **Reports → Acquisition → User acquisition** (or the Search Console report in GA4) to see queries, landing pages, and clicks from search.

**Why:** Combines search performance (queries, CTR) with GA4 behaviour (events, engagement) in one place.

---

### 2.2 Create custom dimensions (recommended)

So that `entry_point` and `page_section` appear as dimensions in reports and explorations:

1. **Admin** → **Data display** → **Custom definitions**.
2. Click **Create custom dimension**.
   - **Dimension name:** e.g. `Entry point`
   - **Scope:** Session
   - **Event parameter:** `entry_point`
   - Save.
3. Create a second one:
   - **Dimension name:** e.g. `Page section`
   - **Scope:** Event
   - **Event parameter:** `page_section`
   - Save.

Parameter names must match exactly: `entry_point` and `page_section`.

**Why:** You can segment by “sessions that entered on home” vs “on archive”, and report “time by section” using `Page section` and engagement time.

---

### 2.3 Useful reports and explorations

- **Engagement → Events**  
  See all event names. Add a secondary dimension (e.g. `Event parameter: entry_slug` for `archive_entry_click`) to see breakdowns.

- **Engagement → Pages and screens**  
  Built-in engagement time by page. Optionally add a segment or exploration filtered by custom dimension `Page section` for “time by section”.

- **Explore → Path exploration**  
  Set starting point (e.g. “First visit” or event `page_section` with `entry_point` = home/archive). Add steps (e.g. `archive_entry_click`, `nav_click`) to see top paths and drop-off.

- **Explore → Funnel exploration**  
  Define steps (e.g. `archive_loaded` → `archive_entry_click` → `video_play`) to analyze conversion from list view to entry view to video engagement.

- **Most-visited entries**  
  In Explore or in Events, filter by event name `archive_entry_click`, then break down by parameter `entry_slug`.

- **List vs Images usage**  
  Use events `archive_loaded` and `archive_entry_click` and break down by parameter `view` (`list` \| `images`).

- **Most-used moods**  
  Event `mood_select`, break down by parameter `mood`.

- **Chat and search**  
  Use `chat_message_sent` (and optionally `message_preview` for themes) and `chat_explore_archive_click` with `results_count` and `search_query` to see chat-driven traffic to the archive.

---

### 2.4 Optional: Mark key events as “Conversions”

In **Admin** → **Data display** → **Events**, open an event (e.g. `lab_submit_proposal_click`, `chat_explore_archive_click`, `archive_entry_click`) and toggle **Mark as conversion** if you want them in conversion-based reports and audiences.

---

### 2.5 Data retention and filters

- **Admin** → **Data settings** → **Data retention**: set event data retention (e.g. 14 months) as needed.
- Use **Admin** → **Data settings** → **Data filters** only if you need to exclude internal traffic; the site does not strip or filter hits in code.

---

## 3. Quick reference: event → report use

| Goal | Event(s) / dimension to use |
|------|-----------------------------|
| Entry/exit and top paths | `page_section`, `entry_point` (custom dimension), Path exploration |
| Time by section | Engagement time + custom dimension **Page section** |
| Most-visited entries | `archive_entry_click` → break down by `entry_slug` |
| List vs Images | `archive_loaded`, `archive_entry_click` → break down by `view` |
| Menu and panel usage | `menu_open`, `menu_close`, `menu_item_click` |
| Mood usage | `mood_select` → break down by `mood` |
| Chat usage and keywords | `chat_message_sent` (e.g. `message_preview`, `word_count`), `chat_panel_open` |
| Chat → Archive | `chat_explore_archive_click` |
| Unexpected Connections | `unexpected_connections_view`, `unexpected_connections_refresh`, `unexpected_connections_entry_click` |
| Video engagement by entry | `video_play`, `video_pause`, `video_complete`, `video_fullscreen` → break down by `entry_slug` |
| Archive sort usage | `archive_sort` → break down by `column`, `direction` |
| Lab “Submit” interest | `lab_submit_proposal_click` |
| Search (Google) performance | Link Search Console (see 2.1) |

---

## 4. Where tracking lives in code

- **gtag helpers:** `src/app/_helpers/gtag.js`
- **GA4 script:** `src/app/(pages)/layout.js` (Script components, measurement ID from gtag)
- **Page/section + entry point:** `src/app/_components/PageSectionTracker.js` (route change)
- **Components** that call the helpers: see comments and imports in `ArchiveViewToggle`, `ArchiveListContent`, `ArchiveEntryListRow`, `ArchiveEntryVideo`, `ArchiveNavigationContainer`, `ArchiveNavigationMoodPanel`, `UnexpectedConnectionsContent`, `UnexpectedConnectionsComparison`, `ChatBox`, `ExploreArchiveLink`, `HeaderNav`, `MediaProtector`, `FirstVisitAnimation`, `HomeContent`, `HelpNav`, `ScrollToVisualEssayImage`, `LabSubmitProposalLink`, `ArchiveClosedViewTracker`.

This guide can be updated when new events or parameters are added.
