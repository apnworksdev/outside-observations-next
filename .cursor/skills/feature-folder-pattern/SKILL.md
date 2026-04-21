---
name: feature-folder-pattern
description: Place new code in domain-centric folders and extract to shared only when reuse is proven. Use before creating or moving files, and when cleaning legacy helper buckets into clearer feature ownership.
---

# Feature Folder Pattern

Use this skill before adding new files.

## Triggers

Apply this skill when:
- adding a file and unsure where it belongs
- refactoring large files into smaller modules
- moving code out of generic folders (for example `_helpers`)

## Placement Rules

1. Put code in owning domain first (for example `archive`, `home`, `visitors`).
2. Promote to `shared` only after reuse is confirmed in two or more domains.
3. Keep domain internals grouped:
   - `components/`
   - `hooks/`
   - `state/`
   - `utils/`
   - `server/` (server-only domain logic)
4. Keep shared modules stable and low-churn; if ownership is mostly one domain, keep it in that domain.

## Anti-patterns

- Dumping unrelated helpers into a global bucket.
- Adding domain-specific code to `shared` too early.
- Mixing React components with unrelated utility logic in the same folder.
- Creating folders for one file without a clear growth path.

## Migration Rule

When touching legacy folders or large files:
- extract one cohesive unit at a time
- keep behavior unchanged
- avoid broad renames unless part of active changes
- prefer "move + import update + verify" in small steps

## Promotion Rule (Domain -> Shared)

Promote a module to `shared` only if all conditions are true:
1. used by 2+ domains
2. API is stable and generic
3. domain-specific naming/details were removed

## Output Format

When done, report:
- new files and their domain placement
- shared promotions and reuse justification
- any temporary legacy placement with follow-up actions
- rollback plan for risky moves
