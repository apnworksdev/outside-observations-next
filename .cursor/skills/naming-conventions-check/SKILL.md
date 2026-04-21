---
name: naming-conventions-check
description: Keep file and symbol naming consistent and predictable. Use when creating/renaming files, reviewing conventions, or detecting naming collisions and unclear ownership across folders.
---

# Naming Conventions Check

Run this skill when creating or renaming files and symbols.

## Triggers

Apply this skill when:
- introducing a new component, hook, util, or CSS module
- renaming files during refactors
- reviewing PRs with mixed naming styles

## Rules

- Components: PascalCase files.
- Hooks: `useXxx` in camelCase files.
- Utilities and state modules: camelCase files.
- CSS modules: kebab-case files.
- Next.js routing files keep framework naming: `page.js`, `layout.js`, `route.js`.
- Avoid generic file names like `helpers`, `utils`, `misc`, `common` unless truly cross-domain.

## Collision Checks

- Same stem with different casing in the same domain (example: `visitTracker` vs `VisitorTracker`).
- Similar names with unclear distinction of responsibility.
- Inconsistent abbreviations without a clear team pattern (example: `Nav` and `Navigation` mixed arbitrarily).

## Canonicalization Guidance

- Prefer full words over short forms when both exist (pick one and standardize).
- Keep semantic prefixes stable (`Archive`, `Visitor`, `ContentWarning`) for discoverability.
- For trackers: distinguish utility vs component explicitly in naming.

## Output Format

When done, report:
- naming violations
- collision risks
- suggested canonical names
- rename safety notes (imports/aliases/routes impacted)
