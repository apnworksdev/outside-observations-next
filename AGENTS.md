# AGENTS.md

## Purpose

Keep this codebase readable, consistent, and easy to evolve under fast iteration.

## Naming Conventions

- React components: PascalCase file names (`ArchiveListContent.js`).
- Hooks and utilities: camelCase file names (`useArchiveScrollPosition.js`, `websiteVisitState.js`).
- CSS modules: kebab-case file names (`archive-page.module.css`, `chat-box.module.css`).
- Next.js routing files: keep framework naming (`page.js`, `layout.js`, `route.js`).

## Folder Intent

- `src/app/_components/layout`: global layout/navigation components.
- `src/app/_components/shared`: cross-domain reusable UI (`shared/error` for error handling).
- `src/app/_components/chat`: shared chat domain components.
- `src/app/_components/Archive`: archive feature domain (`features`, `providers`, `state`).
- `src/app/api`: HTTP handlers only (thin orchestration).
- `src/app/**/server`: reusable server-side domain logic.
- `src/app/_helpers/{analytics,dom,storage,tracking}`: helper domains only (no root bridge files).
- `src/app/_hooks/{archive,chat,shared}`: hooks grouped by domain.
- `src/sanity/components`: Studio UI concerns.
- `src/sanity/utils`: pure transforms and helper logic.

## File Size And Split Policy

- Target file length: <= 250 lines.
- Warning threshold: > 300 lines.
- Required split review: > 400 lines.
- Exceptions are allowed only when cohesion is explicit and documented at file top.

## Separation Rules

- Components should focus on rendering and local UI behavior.
- Business and domain logic should live in `utils`, `state`, `hooks`, or `server`.
- Storage access (`localStorage`, `sessionStorage`) should use shared adapters.
- API routes must not duplicate infrastructure setup (for example Redis client initialization).
- Keep analytics public API stable via barrels, but place implementation in focused modules.

## Reuse Rules

Before creating a new component, hook, or helper:

1. Search for an existing equivalent in the same domain or `shared`.
2. If similar logic exists in 2+ places, extract it.
3. Prefer composition over prop-heavy mega components.

## Readability PR Checklist

- Is naming consistent with file type and folder intent?
- Does each file have one primary responsibility?
- Can a new teammate quickly locate this file by domain?
- Are duplicated guards or adapters centralized?
- Did any file exceed thresholds without justified reason?
- Are import paths using canonical domain locations (no removed bridge paths)?

## Skills To Apply

When relevant, apply project skills under `.cursor/skills/`:

- `readability-structure-check`
- `naming-conventions-check`
- `feature-folder-pattern`
