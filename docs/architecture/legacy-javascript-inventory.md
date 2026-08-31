# Legacy JavaScript inventory

## Source and runtime policy

TypeScript under `apps/sheets/src/` is the maintained source of truth for migrated behavior. esbuild produces
the Apps Script-compatible IIFE `apps/sheets/build/Cockpit.js`; its footer exposes only stable callbacks and the
small compatibility surface still required by deferred JavaScript. Generated JavaScript is never
edited manually.

The remaining Google Sheets UI/runtime behavior has been migrated into TypeScript source under
`apps/sheets/src`. No manually maintained production JavaScript files remain at the `apps/sheets`
root.

## Active manually maintained JavaScript

| File                           | Remaining responsibility                       | Classification |
| ------------------------------ | ---------------------------------------------- | -------------- |
| `apps/sheets/build/Cockpit.js` | Generated IIFE and stable Apps Script wrappers | GENERATED      |

## Removed/migrated JavaScript files

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
| `Analytics.js`     | Migrated to TypeScript analytics query/calculation and Sheets projection                 |
| `Dashboard.js`     | Migrated to TypeScript dashboard query/calculation and Sheets projection                 |
| `Theme.js`         | Migrated to Google Sheets inbound UI TypeScript modules                                  |
| `Documentation.js` | Migrated to Google Sheets inbound UI TypeScript modules                                  |
| `Config.js`        | Removed after constants moved to their owning modules                                    |
| `Utils.js`         | Removed after helpers moved to their owning modules                                      |

Dead physical-row finders were not ported: `findActiveWatchlistRow`,
`findActiveTradePlanByWatchlistId`, `findOpenPositionByTradePlanId`, and
`findJournalRowByPositionId`. Their domain/repository replacements remain authoritative. In
particular, the account-unaware Trade Plan finder and first-Journal-only lookup were not restored.

## Current dependency map

```text
apps/sheets -> packages/core -> packages/contracts
apps/api -> packages/core -> packages/contracts
apps/web -> packages/contracts

packages/core -> no app/infrastructure dependency
packages/contracts -> no app/core dependency
```

The shared TypeScript header helper owns case-insensitive physical header lookup for Google Sheets
repositories and mappers. Sheet lifecycle modules own schema, formulas, validations, formatting,
freeze/resize behavior, and append-only account columns. Core and application code know none of
these details.

## Global surface and deployment

The Apps Script deployment contains the generated bundle and `apps/sheets/appsscript.json`. Menu
targets are generated wrappers backed by TypeScript.

## Roadmap

Keep Apps Script globals limited to supported Google Sheets UI/menu callbacks and avoid reintroducing
maintained production JavaScript unless a future Apps Script constraint requires it.
