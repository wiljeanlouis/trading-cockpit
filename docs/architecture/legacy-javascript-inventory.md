# Legacy JavaScript inventory

## Source and runtime policy

TypeScript under `src/` is the maintained source of truth for migrated behavior. esbuild produces
the Apps Script-compatible IIFE `build/Cockpit.js`; its footer exposes only stable callbacks and the
small compatibility surface still required by deferred JavaScript. Generated JavaScript is never
edited manually.

Phase 11.7 removed all TypeScript dependencies on legacy JavaScript except presentation calls into
`Theme.js`. The remaining six manually maintained JavaScript files are intentionally deferred or
small compatibility modules.

## Active manually maintained JavaScript

| File               | Remaining responsibility                                     | Dependencies                                       | Classification   | Reason retained                                                      |
| ------------------ | ------------------------------------------------------------ | -------------------------------------------------- | ---------------- | -------------------------------------------------------------------- |
| `Analytics.js`     | Legacy aggregate and strategy analytics                      | Config, Utils, Theme; reads Journal                | KEEP_TEMPORARILY | Not account-aware; requires a future financial redesign              |
| `Config.js`        | Seven sheet-name constants used only by deferred modules     | Analytics, Dashboard, Theme                        | KEEP_TEMPORARILY | Small shared compatibility surface; duplicating names would be worse |
| `Dashboard.js`     | Legacy pipeline, performance, and action projection          | Config, Utils, Theme, generated `getTradingConfig` | KEEP_TEMPORARILY | Not account-aware; requires redesign                                 |
| `Documentation.js` | In-spreadsheet operational documentation                     | Theme/presentation globals                         | KEEP_TEMPORARILY | Active UI feature outside the consolidation boundary                 |
| `Theme.js`         | Shared Google Sheets presentation and conditional formatting | Config and header helpers in Utils                 | KEEP_TEMPORARILY | Correct adapter concern; visual migration needs dedicated tests      |
| `Utils.js`         | Header helpers plus Analytics/Dashboard presentation helpers | Deferred modules only                              | KEEP_TEMPORARILY | Reduced to legitimate consumers; no migrated adapter depends on it   |
| `build/Cockpit.js` | Generated IIFE and stable Apps Script wrappers               | Generated from TypeScript                          | GENERATED        | Never maintained manually                                            |

## Removed in Phase 11.7

| File               | TypeScript owner or disposition                                                          |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `CockpitConfig.js` | `cockpit-configuration-sheet.ts`; compatibility read remains available only to Dashboard |
| `Setup.js`         | `setup-momentum-ranking.ts` plus generated menu wrapper                                  |
| `Strategy.js`      | `GoogleSheetsTradingStrategyReader`, setup/validation adapters, and generated wrappers   |
| `Watchlist.js`     | `watchlist-sheet.ts` and `GoogleSheetsWatchlistRepository`                               |
| `TradePlan.js`     | `trade-plan-sheet.ts` and `GoogleSheetsTradePlanRepository`                              |
| `Position.js`      | `position-sheet.ts` and `GoogleSheetsPositionRepository`                                 |
| `Journal.js`       | `journal-sheet.ts` and `GoogleSheetsJournalRepository`                                   |
| `Workflow.js`      | Deleted as dead code; the menu already used focused TypeScript reconciliation            |

Dead physical-row finders were not ported: `findActiveWatchlistRow`,
`findActiveTradePlanByWatchlistId`, `findOpenPositionByTradePlanId`, and
`findJournalRowByPositionId`. Their domain/repository replacements remain authoritative. In
particular, the account-unaware Trade Plan finder and first-Journal-only lookup were not restored.

## Current dependency map

```text
Dashboard -> Config, Utils, Theme, generated getTradingConfig compatibility wrapper
Analytics -> Config, Utils, Theme
Theme -> Config, Utils
Documentation -> Theme/presentation globals

TypeScript adapters -> Theme globals only
TypeScript Core/ports -> no legacy JavaScript
```

The shared TypeScript header helper owns case-insensitive physical header lookup for Google Sheets
repositories and mappers. Sheet lifecycle modules own schema, formulas, validations, formatting,
freeze/resize behavior, and append-only account columns. Core and application code know none of
these details.

## Global surface and deployment

After Phase 11.7, deployment contains six manually maintained JavaScript files, one generated
bundle, and `appsscript.json`. Apps Script exposes 91 global functions and all 20 menu targets remain
resolvable. Setup Strategies, Validate Strategies, Setup Momentum Ranking, and Setup Cockpit Config
are generated wrappers backed by TypeScript.

## Roadmap

1. Redesign Analytics and Dashboard with account-aware query models before migrating them.
2. Migrate Theme only with visual and conditional-format characterization.
3. Migrate Documentation independently as a presentation/UI slice.
4. Remove Config and Utils naturally when their remaining deferred consumers migrate; do not create
   generic TypeScript dumping grounds to eliminate their filenames.
