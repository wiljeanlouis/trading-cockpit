# Trading Cockpit architecture

## Current shape

Trading Cockpit is in a progressive migration from a global Google Apps Script application to a
modular TypeScript application. Both forms run together in the same Apps Script project. Legacy
JavaScript under `backend/` continues to own the remaining inventoried workflows. TypeScript owns the
migrated Watchlist, Trade Plan, Position, Journal, account capital, Momentum, Market Signals, and
Signals History slices.
The multi-account foundation adds explicit Trading Account identity to new Positions and Journals.

The repository root is an orchestration boundary. `backend/` contains the supported Apps Script
application, including the Google Sheets inbound UI. A future `web/` React application may become a
second inbound UI, but it must call backend application capabilities rather than reading Google
Sheets directly. Backend domain rules, sizing, risk, scoring, state transitions, persistence and
provider integrations remain authoritative.

```text
Google Sheets menu
        |
        | stable global wrappers
        v
backend/build/Cockpit.js
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

- `backend/src/core/domain` contains Watchlist, Trade Plan, Position, Journal Entry, Momentum, and market
  signal business values,
  validations, identities, lifecycle transitions, and calculations.
- `backend/src/core/application` orchestrates migrated trading, capital, Momentum, and market signal use
  cases without knowing Google Sheets, Apps Script APIs, or external provider details.
- `backend/src/ports/outbound` declares the minimum capabilities the use cases need: strategy existence,
  Watchlist and Trade Plan persistence, trading configuration, current time, and ID generation.
- `backend/src/adapters/inbound` translates active spreadsheet selections into application commands and
  translates results into the existing spreadsheet toasts.
- `backend/src/adapters/outbound` implements ports with Google Sheets and Apps Script. The Watchlist mapper
  is the explicit boundary between the 22-column sheet schema and domain entries.
- `backend/src/composition` manually wires the use case and concrete adapters.
- `backend/src/entrypoints` exposes functions to the generated bundle. It does not itself create Apps Script
  globals.

## External market signal provider boundary

External provider names must not become domain concepts merely because they are the current
implementation. Trading Cockpit refreshes provider-neutral market signals through the
`MarketSignalSource` port. The provider-neutral application use case validates the associated
strategy, replaces the current projection, and archives the signal snapshot.

Finviz is an outbound adapter implementing that capability. Its URL, screener query, authentication
token, Script Properties storage, HTTP behavior, CSV parsing, response shape, error translation, and
transport-to-signal mapping stay under `backend/src/adapters/outbound/finviz`. The composition root selects
this implementation. The inbound adapter, public callbacks, menu label `Refresh Finviz`, and physical
sheet `Finviz - Momentum` remain provider-specific compatibility surfaces.

```text
Google Sheets: Refresh Finviz
             |
             v
     RefreshMarketSignals
        |            |
        v            v
MarketSignalSource   SignalHistoryRepository
        ^
        |
FinvizMarketSignalSource
  HTTP + token + CSV mapping
```

Signals History persists the provider-neutral business snapshot. Momentum reads business-level
signals and contains no dependency on Finviz transport, authentication, CSV representation, or
adapter types. See ADR 0009.

## Build and runtime boundary

`npm run build:cockpit` bundles TypeScript modules into the Apps Script-compatible IIFE
`backend/build/Cockpit.js`. The build appends stable global functions for migrated menu actions and `onOpen`.
The menu definition itself is maintained in a TypeScript inbound adapter. The Sheets menu therefore
keeps its existing labels and callback names while implementations change behind them. Watchlist,
Trade Plan, Position, Journal, Strategy, setup, and Cockpit Config physical infrastructure are now
TypeScript-owned Google Sheets adapters. Theme remains the only intentional JavaScript dependency
from those adapters.

## Watchlist contract preserved by the slice

The inbound adapter reads only the selected Momentum Ranking row. The application layer validates
and normalizes the candidate, confirms that its Strategy ID exists, detects an active duplicate,
then creates an entry. The outbound adapter preserves the existing Watchlist creation, schema
validation, formula, formatting, dropdown, and theme helpers.

The outbound adapter owns Watchlist lifecycle, schema validation, formulas, validation dropdowns,
and row formatting. Strategy lookup uses a shared Google Sheets strategy reader. Presentation still
delegates to Theme as an explicit deferred adapter boundary.

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

New Trade Plans derive realized equity and Risk % from their selected Trading Account and freeze
those values as snapshots. `Cockpit Config` Account Equity and Default Risk % remain compatibility
data for Dashboard and historical interpretation only; there is no fallback from account-owned
Trade Plan creation to these global values.

## Core calculations and Google Sheets formulas

Risk / Share, Reward / Share, Risk : Reward, Max Risk, Position Size, and Position Value are derived
business rules. Pure TypeScript functions now express and test their behavior. The historical Sheet
formulas remain the runtime authority temporarily: the mapper leaves their six cells empty and the
Google Sheets adapter installs the same formulas after insertion.

This coexistence enables parity validation. Formula removal requires representative production
comparison and a separate decision; it is not part of the Create Trade Plan cutover. The complete
30-column append-only contract is documented in [Trade Plan schema](trade-plan-schema.md).

The mutation order remains Trade Plan append/formulas/format, then Watchlist status update, then
Trade Plan theme. If the Watchlist update fails after append, a DRAFT plan can exist while the
Watchlist is not `PLANNED`. Workflow reconciliation is the current recovery mechanism; no simulated
transaction has been introduced.

## Open Position flow

```text
Trade Plan selection
       |
       +----> Account ID prompt and TradingAccountRepository validation
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

Trading Accounts own external capital history and risk policy without storing mutable equity. Trade
Plans stay single-execution, so the same ticker may be opened in several accounts through distinct
account-owned plans.
See [Trading Accounts foundation](trading-accounts.md) and ADR 0005.

## Active trading external capital

The `Capital Ledger` records INITIAL_FUNDING, DEPOSIT, and WITHDRAWAL per Trading Account as immutable
append-only history. These external flows are separate from Position/Journal trading performance.
Account-level summaries derive NetExternalCapital in the account base currency. New Trade Plan sizing
derives realized equity by adding authoritative Journal realized P&L, then snapshots account Risk %.
It never interprets equity as cash or buying power. See [Capital Ledger](capital-ledger.md),
[Account equity](account-equity.md), ADR 0006, and ADR 0007.

## Close Position to Journal flow

```text
Position OPEN selection + Exit Price prompt
                 |
                 v
          Close Position use case
                 |
                 +----> PositionRepository -> CLOSED, Closed At, Exit Price, Realized P&L
                 +----> JournalRepository -> one result snapshot per Position ID
                 +----> WatchlistRepository -> CLOSED
                 +----> RuntimePort -> Closed At, then Journal ID when required
                                      |
                                      v
                             Google Sheets adapters
                                      |
                                      v
                             Analytics (still legacy)
```

Only `OPEN` is closeable through this action, and it always transitions to `CLOSED`. The existing
`STOPPED` and `TARGET HIT` dropdown values are terminal states but are not selected by the close
workflow. Exit Reason remains a later user annotation in Journal and is not inferred from Position
status, Current Stop, or Target.

The mutation order remains four Position cell writes, Journal duplicate lookup and optional append,
Watchlist `CLOSED`, then Position theme and toast. Trade Plan, Analytics, Dashboard, Cockpit Config,
and account capital are not mutated. Journal creation preserves the historical 26-column snapshot,
including empty annotation fields. Return %, R-Multiple, and Outcome have pure Core equivalents, but
the adapter keeps installing the historical T/U/V formulas under ADR 0004. See
[Journal schema](journal-schema.md).

There is no cross-sheet transaction. A Position-write failure stops the flow; a Journal failure can
leave a terminal Position without a Journal; a Watchlist failure can leave Position and Journal
complete while Watchlist remains stale. Duplicate lookup prevents a second Journal when one already
exists, but a normal retry cannot repair a terminal Position because non-`OPEN` status is rejected to
preserve legacy behavior. These states can be detected later by Position ID and Watchlist ID and are
candidates for a future reconciliation command.

Position and Journal sheet lifecycle, historical schema validation, formulas, dropdowns, formatting,
and append-only Account ID columns are owned by TypeScript outbound adapters. Their presentation
continues to call the deferred Theme boundary.

## Closed Position reconciliation

Reconciliation is a focused application recovery operation for the manual close workflow. It is not
another Position lifecycle transition and never calls `closePosition`, changes Closed At, recalculates
Realized P&L, or reopens a Position.

The completed invariant for a manually closed Position is:

```text
Position status = CLOSED
  + Closed At, Exit Price and Realized P&L persisted
  + exactly one Journal row for Position ID
  + associated Watchlist status = CLOSED
```

`reconcileClosedPosition({ positionId })` accepts only `CLOSED`; `STOPPED` and `TARGET HIT` remain
outside this recovery path. Before creating Journal, it requires the persisted identifiers, strategy
snapshot, ticker, Closed At, Exit Price, and Realized P&L. Optional historical snapshot fields remain
optional exactly as in normal Journal creation. Actual Entry and Actual Quantity must also be present:
their mappers preserve blank snapshots so reconciliation blocks instead of manufacturing numeric zero.

Recoverable states are a missing Journal with a stale or already-closed Watchlist, and an existing
single Journal with a stale Watchlist. A missing Journal is recreated through the same repository,
mapper, formulas, formatting, and theme as normal close. An already-complete state is a no-op. Two or
more Journals for one Position are reported as inconsistent and prevent Watchlist mutation; no row is
deleted or merged automatically.

The repair order is Journal inspection/optional creation, then Watchlist inspection/optional update.
If Journal creation fails, Watchlist is untouched. If Watchlist update fails after Journal creation, a
retry sees the existing Journal and retries only Watchlist. The operation is sequentially idempotent,
but no uniqueness constraint or lock prevents two simultaneous runs from both observing a missing
Journal and appending. The menu action `Reconcile Selected Position` exposes this use case for a
selected Positions row.

## Architecture POC retirement

The greeting-based `backend/src/poc` demonstration and its tests were removed after three real Cockpit
slices validated the modular runtime. No build, runtime, or architectural check depended on them.
The bundle smoke test still asserts that the obsolete `runArchitecturePoc` global is absent.

## Runtime observability

Critical user-triggered workflows emit concise V8 console events with a shared six-character run ID:
market-signal and Momentum refresh, Watchlist insertion, Trade Plan creation, Position opening and
closing, closed-Position reconciliation, and capital transactions. Account equity components are
reported at the application boundary when Trade Plan sizing invokes the calculation. Pure domain
calculations remain log-free.

The log shape is `[TradingCockpit][workflow][runId] EVENT key=value`. Normal milestones use
`console.info`; duplicate, blocked, no-action, inconsistent, and valid-empty outcomes use
`console.warn`; unexpected adapter/runtime failures use `console.error` with an explicit stage. A
close failure after Position persistence is marked `PARTIAL_FAILURE` at `JOURNAL_LOOKUP`,
`JOURNAL_CREATION`, or `WATCHLIST_UPDATE`, so operators can determine whether reconciliation is
required. Logs are not persisted in Sheets and never include Finviz tokens, authenticated URLs, or
Script Properties.

For market-signal refresh, the permanent sequence exposes strategy identity, HTTP status and response
size, CSV header/data-row counts, mapped signal/attribute counts, projected rows and physical
`setValues` dimensions, prepared/appended Signal snapshots, and total archived signals. A valid
header-only provider response is explicitly warned as `VALID_EMPTY_RESULT`; malformed, non-CSV, or
failed responses retain their exceptions and report the failing adapter stage.

## Migration rule

Google Sheets is an adapter, not the core. New migrations should start from one characterized
workflow, keep its observable spreadsheet behavior stable, move business decisions into the core,
and isolate Apps Script services behind narrow ports. Unrelated workflows should not be pulled into
a slice merely because they share the same spreadsheet runtime.
