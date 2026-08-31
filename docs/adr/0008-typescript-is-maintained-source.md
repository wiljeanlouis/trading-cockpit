# ADR 0008: TypeScript is the maintained application source

- Status: Accepted, amended by ADR 0012
- Date: 2026-08-28

## Context

Trading Cockpit is deployed to Google Apps Script as JavaScript, but migrated vertical slices are
maintained in TypeScript. Keeping competing JavaScript implementations creates two sources of truth
and exposes internal helpers as Apps Script globals.

## Decision

TypeScript under `backend/src/` is the maintained source for migrated application behavior. esbuild produces
`backend/build/Cockpit.js` as an IIFE and appends the stable global functions required by Apps Script triggers
and menu callbacks. Generated JavaScript is never edited manually.

JavaScript at the `backend/` root is allowed only for explicitly inventoried legacy features or temporary Google
Sheets adapter helpers. A migrated workflow's competing JavaScript implementation is deleted after
reference analysis and regression validation. Legacy migration proceeds by vertical slice, not by
blind syntax conversion.

## Consequences

Apps Script continues to execute JavaScript without requiring separate handwritten wrapper files.
The deployed global namespace shrinks as legacy slices migrate. Remaining JavaScript debt is explicit
in the legacy inventory. Build, global-collision, menu-target, architecture, and regression checks
guard the boundary.
