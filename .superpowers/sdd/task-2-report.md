# Task 2 Report: UI primitives Badge and Skeleton

Implemented the two requested UI primitives in `frontend/src/components/ui/`:

- `Badge({ tone, children })` with the exact `manager | staff` tone contract and Task 1 badge classes.
- `Skeleton({ height?, width?, radius? })` with the exact default sizing contract and Task 1 `.skeleton` class.

What changed:
- Added `frontend/src/components/ui/Badge.tsx`.
- Added `frontend/src/components/ui/Skeleton.tsx`.
- Kept the implementation minimal and aligned to the brief’s exact API.

Verification:
- `npx tsc --noEmit` ✅
- `npm test` ⚠️ failed before tests ran in this restricted worktree with:
  - `X [ERROR] Cannot read directory "../../../..": Access is denied.`
  - `X [ERROR] Could not resolve "C:\\Users\\User\\shift-app\\.worktrees\\codex-shift-ui-redesign\\frontend\\vite.config.ts"`
- `npm run build` ⚠️ failed with the same sandbox/path-resolution issue:
  - `X [ERROR] Cannot read directory "../../../..": Access is denied.`
  - `X [ERROR] Could not resolve "C:\\Users\\User\\shift-app\\.worktrees\\codex-shift-ui-redesign\\frontend\\vite.config.js"`

Concerns:
- The Vitest and build failures appear environmental rather than caused by these two components.
- No dependencies, API surface, or domain logic were changed.
