---
name: readability-structure-check
description: Enforce file readability boundaries and modular structure. Use when adding/refactoring code, when files feel hard to scan, or when modules exceed size thresholds and need split recommendations.
---

# Readability Structure Check

Run this skill whenever adding or modifying files.

## Triggers

Apply this skill when:
- a file is large, hard to navigate, or has mixed responsibilities
- a review asks for readability improvements (not performance work)
- architecture is acceptable but module boundaries are unclear

## Checklist

1. Verify file length:
   - <= 250 ideal
   - > 300 warn
   - > 400 justify or split
2. Confirm each file has one primary responsibility.
3. Move non-UI logic out of large components into hooks, utils, or state modules.
4. Keep API routes orchestration-only (avoid duplicated infrastructure setup).
5. Confirm new files are placed in the correct domain folder.

## Non-goals

- Do not propose behavior changes when readability-only refactors are sufficient.
- Do not suggest broad rewrites when a focused extraction solves the issue.

## Heuristics For Splitting

- If a component has more than three concerns (for example rendering + storage + analytics + network), split.
- If helper names include multiple verbs (for example parse + transform + persist), split.
- If a file contains unrelated sections separated by large comment blocks, split by concern.

## Suggested Split Shapes

- UI components: `View` + `hooks` + `utils`
- API routes: `route.js` + `server/<domain>.js` for business logic
- Large helpers: `normalizers`, `validators`, and `adapters` as separate modules

## Output Format

When done, report:
- files reviewed
- files above thresholds
- proposed split boundaries
- any justified exceptions
- migration order (smallest-risk first)
