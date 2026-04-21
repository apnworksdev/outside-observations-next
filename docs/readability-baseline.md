# Readability Baseline

Date: 2026-04-21
Scope: `src/` readability and project organization baseline before incremental refactors.

## Goals

- Establish a factual baseline before code movement.
- Prioritize readability improvements with low behavior risk.
- Enable step-by-step commits with clear scope per commit.

## Oversized Files (300+ lines)

Current files above 300 lines in `src/`:

- 837 `src/app/_components/Archive/ArchiveEntriesProvider.js`
- 752 `src/app/_components/Archive/ArchiveListContent.js`
- 658 `src/app/_assets/archive/archive-navigation.module.css`
- 619 `src/app/_components/Home/ChatBox.js`
- 575 `src/app/_assets/nav.module.css`
- 557 `src/sanity/components/tools/CsvImportTool/index.js`
- 540 `src/sanity/components/inputs/VisualEssayImagesInput/index.js`
- 526 `src/sanity/components/inputs/MediaWithAIButton/index.js`
- 517 `src/sanity/utils/csvImport.js`
- 466 `src/app/_assets/archive/archive-entry.module.css`
- 453 `src/app/_assets/archive/archive-page.module.css`
- 425 `src/sanity/lib/queries.js`
- 376 `src/sanity/components/tools/BulkDeleteTool/index.js`
- 369 `src/app/_assets/chatbox.module.css`
- 368 `src/sanity/documentActions/vectorStoreDocumentActions.js`
- 359 `src/app/_components/Home/FirstVisitAnimation.js`
- 340 `src/app/_helpers/gtag.js`
- 336 `src/app/_components/Archive/Navigation/ArchiveNavigation.js`
- 314 `src/app/_components/PageTransition.js`
- 311 `src/sanity/schemaTypes/archive-metadata.js`
- 306 `src/app/_assets/lab.module.css`
- 304 `src/app/_components/Archive/ArchiveEntryVideo.js`
- 303 `src/app/_helpers/VisitorTracker.js`

## Naming and Structure Observations

### Tracker naming collisions

- `src/app/_helpers/visitTracker.js` (utility style)
- `src/app/_helpers/VisitorTracker.js` (component style)
- `src/app/_helpers/WebsiteVisitTracker.js` (component style)

Risk: mixed casing and overlapping domain language increase lookup/debug time.

### Mixed responsibilities in large modules

- `ArchiveEntriesProvider.js` combines view storage, session storage, sorting/filtering, routing integration, and provider state.
- `ArchiveListContent.js` combines rendering, navigation preparation, scroll restoration, analytics tracking, and view-specific logic.

Risk: harder onboarding and change safety due to many concerns in one file.

### Duplicated API infrastructure

Redis initialization and env checks are duplicated in:

- `src/app/api/visitors/route.js`
- `src/app/api/visitors/events/route.js`

Risk: divergence in error handling/config behavior over time.

### Generic bucket folders

- `_helpers` currently includes both pure utility modules and React client components.

Risk: weak folder intent and harder discoverability.

## Prioritized Refactor Backlog

### Priority 1 (highest readability impact, controlled scope)

1. Split `ArchiveEntriesProvider.js`
   - Extract storage/session helpers.
   - Extract sorting/filtering/normalization helpers.
   - Keep provider API unchanged.

2. Split `ArchiveListContent.js`
   - Extract media-rendering subcomponents.
   - Extract overlay/link handling and sort control helpers.
   - Keep existing behavior and events unchanged.

### Priority 2 (duplication reduction)

3. Extract shared visitors Redis/server helper used by both visitor routes.

### Priority 3 (naming consistency in touched areas)

4. Normalize tracker naming and file intent for touched modules.
   - Distinguish utility modules from effectful React tracker components.

## Commit-by-Commit Execution Plan

1. **Commit 1 (this document):** baseline + roadmap.
2. **Commit 2:** `ArchiveEntriesProvider` phase 1 (storage extraction).
3. **Commit 3:** `ArchiveEntriesProvider` phase 2 (sorting/filtering extraction).
4. **Commit 4:** `ArchiveListContent` phase 1 (media renderer extraction).
5. **Commit 5:** `ArchiveListContent` phase 2 (overlay/sort/link extraction).
6. **Commit 6:** shared visitors Redis helper.
7. **Commit 7:** naming cleanup in touched modules only.

## Verification Standard Per Commit

- Preserve runtime behavior.
- Keep diffs narrowly scoped to one readability objective.
- Run lint/build/tests relevant to touched modules before completing each commit.
- Avoid broad file moves and broad renames in the same commit.
