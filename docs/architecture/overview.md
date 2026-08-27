# Trading Cockpit architecture

## Current shape

Trading Cockpit is in a progressive migration from a global Google Apps Script application to a
modular TypeScript application. Both forms run together in the same Apps Script project. Legacy
root-level JavaScript continues to own all workflows except the migrated Watchlist add-candidate,
Create Trade Plan, and Open Position slices.

```text
Google Sheets menu
        |
        | stable global wrappers
        v
build/Cockpit.js
  entrypoint -> composition root -> inbound Google Sheets adapter
                                      |
                                      v
                              application use case
                                      |
                         +------------+-------------+
                         |                          |
                    domain rules               outbound ports
                                                    |
                         +--------------------------+------------------+
                         |                          |                  |
                 Strategy repository       Watchlist repository   Runtime port
                         |                          |                  |
                         v                          v                  v
                  Google Sheets              Google Sheets      Apps Script
                    adapter                    adapter            adapter
```

## Layer responsibilities

- `src/core/domain` contains Watchlist and Trade Plan business values, validations, identities,
  defaults, statuses, and risk calculations.
- `src/core/application` orchestrates the add-candidate and Create Trade Plan use cases without
  knowing Google Sheets or Apps Script APIs.
- `src/ports/outbound` declares the minimum capabilities the use cases need: strategy existence,
  Watchlist and Trade Plan persistence, trading configuration, current time, and ID generation.
- `src/adapters/inbound` translates active spreadsheet selections into application commands and
  translates results into the existing spreadsheet toasts.
- `src/adapters/outbound` implements ports with Google Sheets and Apps Script. The Watchlist mapper
  is the explicit boundary between the 22-column sheet schema and domain entries.
- `src/composition` manually wires the use case and concrete adapters.
- `src/entrypoints` exposes functions to the generated bundle. It does not itself create Apps Script
  globals.

## Build and runtime boundary

`npm run build:cockpit` bundles TypeScript modules into the Apps Script-compatible IIFE
`build/Cockpit.js`. The build appends stable global functions for `addSelectedToWatchlist` and
`createTradePlanFromSelectedWatchlist`. The Sheets menu therefore keeps its existing function names
while implementations change behind them.

The old implementation remains temporarily in `Watchlist.js` as
`legacyAddSelectedToWatchlist_`. It is not the active menu target and exists only as a rollback aid
during stabilization.

The old Create Trade Plan implementation similarly remains in `TradePlan.js` as
`legacyCreateTradePlanFromSelectedWatchlist_`. Execution and the remaining Trade Plan helpers remain
legacy.

## Watchlist contract preserved by the slice

The inbound adapter reads only the selected Momentum Ranking row. The application layer validates
and normalizes the candidate, confirms that its Strategy ID exists, detects an active duplicate,
then creates an entry. The outbound adapter preserves the existing Watchlist creation, schema
validation, formula, formatting, dropdown, and theme helpers.

During this transitional slice, outbound adapters deliberately delegate to the existing
`getStrategy`, Watchlist lifecycle, formula, formatting, and theme helpers. This keeps their current
schema validation and side effects intact, but remains an explicit legacy dependency to remove only
when those capabilities receive their own characterized migrations.

The duplicate key remains Strategy ID plus Strategy Version plus Ticker. Strategy ID and Ticker are
trimmed and case-insensitive; Strategy Version is trimmed and case-sensitive. `CLOSED` and
`REJECTED` are terminal statuses; every other status remains active.

## Create Trade Plan flow

```text
Watchlist selection
       |
       v
Create Trade Plan use case
       |
       +----> Trade Plan risk calculations
       |
       +----> StrategyRepository
       |
       +----> TradingConfigurationPort
       |
       +----> TradePlanRepository
       |
       +----> WatchlistRepository -> status PLANNED
                               |
                               v
                      Google Sheets adapters
```

The inbound adapter passes only the selected Watchlist ID. The use case loads the Watchlist
snapshot, preserves the legacy field validation order, checks Strategy existence and the required
Invalidation Level, detects an active Trade Plan, creates the plan, saves it, then marks Watchlist
`PLANNED`. The legacy has no Watchlist-status eligibility rule, so the Core deliberately does not
invent one.

`Cockpit Config` remains static configuration. Its account equity and default risk percentage are
copied into each Trade Plan as a historical snapshot. A future dynamic account or portfolio balance
is a separate boundary and is not represented by `TradingConfigurationPort` in this slice.

## Core calculations and Google Sheets formulas

Risk / Share, Reward / Share, Risk : Reward, Max Risk, Position Size, and Position Value are derived
business rules. Pure TypeScript functions now express and test their behavior. The historical Sheet
formulas remain the runtime authority temporarily: the mapper leaves their six cells empty and the
Google Sheets adapter installs the same formulas after insertion.

This coexistence enables parity validation. Formula removal requires representative production
comparison and a separate decision; it is not part of the Create Trade Plan cutover. The complete
29-column contract is documented in [Trade Plan schema](trade-plan-schema.md).

The mutation order remains Trade Plan append/formulas/format, then Watchlist status update, then
Trade Plan theme. If the Watchlist update fails after append, a DRAFT plan can exist while the
Watchlist is not `PLANNED`. Workflow reconciliation is the current recovery mechanism; no simulated
transaction has been introduced.

## Open Position flow

```text
Trade Plan selection
       |
       v
Inbound Google Sheets adapter
       |
       v
Open Position use case
       |
       +----> Position domain
       +----> StrategyRepository
       +----> PositionRepository
       +----> TradePlanRepository -> EXECUTED
       +----> WatchlistRepository -> ENTERED
       +----> RuntimePort
                          |
                          v
                 Google Sheets adapters
```

The plan preserves intent; Position preserves execution. Planned Entry and Planned Quantity are
copied unchanged, while Actual Entry and Actual Quantity are separate fields produced by the
legacy's numeric conversion of those planned values. They are equal at opening today but are not
the same domain concept. Similarly, Trade Plan Created At and Position Opened At remain distinct.

Only `DRAFT` and `READY` plans are executable. The new Position status is `OPEN`; the observed
lifecycle also contains `CLOSED`, `STOPPED`, and `TARGET HIT`. One `OPEN` Position per Trade Plan ID
provides duplicate protection. A normal second click sees the plan already `EXECUTED`; a retry after
a partial failure before that transition instead sees the existing `OPEN` Position.

The mutation order remains Position append/formulas/format, Trade Plan `EXECUTED`, Watchlist
`ENTERED`, then Position theme. A failure can therefore leave an open Position with a non-executed
plan, or an executed plan with a non-entered Watchlist. The existing workflow reconciliation can
repair Watchlist state, but no transaction manager is introduced.

Position uses no TradingConfigurationPort and does not update capital. A future account/exposure
domain may consume actual entry and quantity, but it is intentionally outside this slice.

Current Price remains an external `GOOGLEFINANCE` persistence formula. Unrealized P&L and
Unrealized P&L % are derived business formulas with pure TypeScript equivalents and parity tests;
their Sheet formulas remain in place under ADR 0004. See the complete
[Position schema](position-schema.md).

## Architecture POC retirement

The greeting-based `src/poc` demonstration and its tests were removed after three real Cockpit
slices validated the modular runtime. No build, runtime, or architectural check depended on them.
The bundle smoke test still asserts that the obsolete `runArchitecturePoc` global is absent.

## Migration rule

Google Sheets is an adapter, not the core. New migrations should start from one characterized
workflow, keep its observable spreadsheet behavior stable, move business decisions into the core,
and isolate Apps Script services behind narrow ports. Unrelated workflows should not be pulled into
a slice merely because they share the same spreadsheet runtime.
