# Legacy JavaScript inventory

## Source and runtime policy

TypeScript under `src/` is the maintained source of truth for migrated behavior. esbuild produces
the Apps Script-compatible IIFE `build/Cockpit.js`; its footer exposes stable global callbacks.
Generated JavaScript is never edited manually. Root JavaScript remains only for explicitly
documented legacy features and Google Sheets helpers not yet migrated.

Classifications are primary and exclusive: `DELETE`, `MIGRATE_TO_TS`, `KEEP_TEMPORARILY`,
`RUNTIME_WRAPPER`, or `GENERATED`.

## Inventory

| File               | Runtime responsibility and dependencies                                               | Sheets/UI/external effects                                             | TypeScript replacement                                                                      | Classification   | Reason                                                                          |
| ------------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------- |
| Analytics.js       | Calculates and renders legacy aggregate and strategy analytics; calls Utils and Theme | Reads Journal; writes Analytics                                        | None                                                                                        | KEEP_TEMPORARILY | Analytics is not account-aware and needs a future vertical slice                |
| CockpitConfig.js   | Creates and reads global legacy Account Equity, Default Risk %, and Currency          | Reads/writes Cockpit Config; toasts                                    | `TradingConfigurationPort` covers reads for legacy consumers only                           | KEEP_TEMPORARILY | Setup and legacy Dashboard/configuration still require it                       |
| Config.js          | Declares sheet names, screener definitions, and strategy headers                      | Runtime globals only                                                   | Partial constants are local to adapters                                                     | KEEP_TEMPORARILY | Nearly every remaining legacy module consumes these globals                     |
| Dashboard.js       | Calculates pipeline/performance/actions and renders Dashboard                         | Reads most workflow sheets; writes Dashboard; calls `getTradingConfig` | None                                                                                        | KEEP_TEMPORARILY | Dashboard migration is explicitly out of scope                                  |
| Documentation.js   | Builds the in-spreadsheet operational documentation                                   | Creates/writes Documentation; formatting                               | Markdown architecture docs do not replace runtime sheet generation                          | KEEP_TEMPORARILY | Active menu feature with substantial presentation behavior                      |
| Finviz.js          | Former Finviz refresh orchestration                                                   | HTTP, projection and toast                                             | Provider-neutral Market Signals use cases/ports plus Finviz outbound adapter                | MIGRATE_TO_TS    | Migrated and deleted in Phase 11.6                                              |
| FinvizAuth.js      | Former token management                                                               | Prompts, ScriptProperties                                              | Finviz adapter token service/storage and inbound UI adapter                                 | MIGRATE_TO_TS    | Migrated and deleted in Phase 11.6                                              |
| Journal.js         | Creates/validates Journal sheet and installs formulas/formatting                      | Reads/writes Journal; calls Theme                                      | Domain, close, reconciliation, mapper and repository are TS; repository still calls helpers | KEEP_TEMPORARILY | Legacy business creation removed; adapter helpers remain runtime dependencies   |
| MomentumRanking.js | Former ranking orchestration                                                          | Reads signals and writes ranking                                       | Momentum domain/use case/ports/Sheets adapters                                              | MIGRATE_TO_TS    | Migrated and deleted in Phase 11.6                                              |
| MomentumScore.js   | Former five scoring globals                                                           | Pure calculations                                                      | `src/core/domain/momentum.ts`                                                               | MIGRATE_TO_TS    | Migrated and deleted in Phase 11.6                                              |
| Position.js        | Creates/validates Position sheet and installs formulas/formatting                     | Reads/writes Positions; calls Theme                                    | Position domain/use cases/mapper/repository are TS                                          | KEEP_TEMPORARILY | Competing execute/close workflows removed; helpers still required by TS adapter |
| Setup.js           | Creates Momentum Score Config and Momentum Ranking layouts/formulas                   | Creates and formats setup sheets                                       | Trading Account setup only is TS                                                            | KEEP_TEMPORARILY | Active menu setup for legacy ranking                                            |
| SignalsHistory.js  | Former signal archival workflow                                                       | Reads/writes Signals History                                           | Provider-neutral archive use case and Signals History repository                            | MIGRATE_TO_TS    | Migrated and deleted in Phase 11.6                                              |
| Strategy.js        | Creates, validates, and queries strategy registry                                     | Reads/writes Strategies; calls Theme                                   | `StrategyRepository` adapter calls `getStrategy`                                            | KEEP_TEMPORARILY | Registry setup/query remains an adapter dependency                              |
| Theme.js           | Shared Google Sheets presentation and conditional formatting                          | Formats every cockpit sheet                                            | None                                                                                        | KEEP_TEMPORARILY | Correct adapter/UI concern, but broad migration has little immediate value      |
| TradePlan.js       | Creates/validates Trade Plans sheet and installs formulas/formatting                  | Reads/writes Trade Plans; calls Theme                                  | Trade Plan domain/use case/mapper/repository are TS                                         | KEEP_TEMPORARILY | Competing creation workflow removed; physical schema helpers still required     |
| Utils.js           | Mixed header, parsing, date, Analytics, and Dashboard helpers                         | Reads/writes ranges and formatting                                     | Several migrated mappers have scoped equivalents                                            | KEEP_TEMPORARILY | Still heavily consumed by active Analytics/Dashboard/legacy adapters            |
| Watchlist.js       | Creates/validates Watchlist sheet and installs formulas/formatting                    | Reads/writes Watchlist; calls Theme                                    | Watchlist domain/use case/mapper/repository are TS                                          | KEEP_TEMPORARILY | Competing add workflow removed; physical helpers remain required                |
| Workflow.js        | Provides manual status reconciliation                                                 | Reads Positions/Trade Plans; writes Watchlist statuses                 | Watchlist status persistence is now TS                                                      | KEEP_TEMPORARILY | Only the legacy reconciliation command remains                                  |
| Menu.js            | Former `onOpen` menu definition                                                       | Created the Trading Cockpit menu                                       | `install-cockpit-menu.ts` plus generated `onOpen` wrapper                                   | MIGRATE_TO_TS    | Migrated and deleted with all 20 labels/targets preserved                       |
| build/Cockpit.js   | Generated IIFE and stable Apps Script wrappers                                        | Executes bundled adapters and entrypoints                              | Rebuilt from `src/entrypoints/apps-script.ts`                                               | GENERATED        | Build output; never maintained manually                                         |

There are no remaining files classified `DELETE` or `RUNTIME_WRAPPER`. Runtime wrappers live in the
generated bundle footer rather than manually maintained files.

## Removed superseded functions

Reference analysis proved these implementations had no menu, trigger, bundle, adapter, custom
function, or cross-file caller. Their TypeScript vertical slices are authoritative, so they were
deleted:

- `legacyAddSelectedToWatchlist_`
- `legacyCreateTradePlanFromSelectedWatchlist_`
- `legacyExecuteSelectedTradePlan_`
- `legacyCloseSelectedPosition_`
- `createJournalEntryFromPosition`

Formula, schema, validation, formatting, and characterization helpers were retained. Formula parity
tests remain because formulas are an intentional physical-sheet compatibility layer, not the
authoritative migrated business workflow.

## Dependency map

Important JavaScript-to-JavaScript dependencies are:

```text
Dashboard -> Config, CockpitConfig/getTradingConfig, Utils/*, Theme/dashboard helpers
Analytics -> Config, Utils/*, Theme/themeAnalytics
Setup -> Config, Theme, createMomentumScoreConfig, createMomentumRanking
Strategy -> Config, Utils, Theme/themeSimpleSheet
Watchlist/TradePlan/Position/Journal -> Config, Utils, Theme (sheet adapter helpers only)
Workflow/reconcileWorkflowStatuses -> Config, Utils; manual legacy recovery only
Documentation -> Config/theme constants and direct Sheets presentation
```

JavaScript-to-bundle dependencies are menu callback names only. Apps Script resolves generated
globals for `addSelectedToWatchlist`, `createTradePlanFromSelectedWatchlist`,
`executeSelectedTradePlan`, `closeSelectedPosition`, `reconcileSelectedPosition`,
`setupTradingAccounts`, `recordInitialFunding`, `recordDeposit`, `recordWithdrawal`, `refreshFinviz`,
`refreshMomentumRanking`, and Finviz token management. `onOpen` is also generated and delegates to
the bundled TypeScript menu adapter.

Conversely, the current bundle temporarily calls documented legacy globals for sheet creation,
schema validation, formulas, formatting, themes, strategy lookup, trading configuration compatibility,
and strategy lookup. These declarations are located at the outbound adapter boundary; none leak into
Core or ports. Watchlist status persistence no longer calls a legacy global.

## Global surface and deployment

Phase 11.6 starts from 19 manually maintained root JavaScript files and 147 global functions. After
Momentum, Finviz/Signals, and Watchlist status migration, deployment contains 14 manual JavaScript
files plus one generated bundle and exposes 129 global functions. The menu remains at 20 targets.

`.claspignore` excludes TypeScript, tests, documentation, tooling, dependencies, and repository
metadata. Deployment consists of the remaining root Apps Script files, generated
`build/Cockpit.js`, and `appsscript.json`.

## Roadmap

Recommended future vertical slices are:

1. Analytics and Dashboard account-aware query models when their financial redesign is scheduled.
2. TypeScript Google Sheets schema/formula/formatting helpers for Watchlist, Trade Plan, Position,
   Journal, Strategy, Workflow, Setup, Theme, and scoped Utils.
3. Strategy and setup infrastructure still used by Momentum and market-signal adapters.
4. Theme and Documentation after their visual/runtime contracts receive dedicated regression tests.

Each slice should remove its legacy globals only after generated entrypoints and adapter behavior are
covered by regression tests.
