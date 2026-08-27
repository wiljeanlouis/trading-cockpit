# Trading Cockpit architecture

## Current shape

Trading Cockpit is in a progressive migration from a global Google Apps Script application to a
modular TypeScript application. Both forms run together in the same Apps Script project. Legacy
root-level JavaScript continues to own all workflows except the first migrated Watchlist slice.

```text
Google Sheets menu
        |
        | addSelectedToWatchlist (stable global wrapper)
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

- `src/core/domain` contains business values and rules: candidate normalization, required fields,
  Watchlist identity, active/terminal status semantics, and new-entry defaults.
- `src/core/application` orchestrates the add-candidate use case without knowing Google Sheets or
  Apps Script APIs.
- `src/ports/outbound` declares the minimum capabilities the use case needs: strategy existence,
  Watchlist lookup/save, current time, and ID generation.
- `src/adapters/inbound` translates the active Momentum Ranking row into an application command and
  translates the result into the existing spreadsheet toasts.
- `src/adapters/outbound` implements ports with Google Sheets and Apps Script. The Watchlist mapper
  is the explicit boundary between the 22-column sheet schema and domain entries.
- `src/composition` manually wires the use case and concrete adapters.
- `src/entrypoints` exposes functions to the generated bundle. It does not itself create Apps Script
  globals.

## Build and runtime boundary

`npm run build:cockpit` bundles TypeScript modules into the Apps Script-compatible IIFE
`build/Cockpit.js`. The build appends the stable global function `addSelectedToWatchlist`, which
delegates to `CockpitBundle.addSelectedToWatchlist`. The Sheets menu therefore keeps its existing
function name while the implementation changes behind it.

The old implementation remains temporarily in `Watchlist.js` as
`legacyAddSelectedToWatchlist_`. It is not the active menu target and exists only as a rollback aid
during stabilization.

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

## Migration rule

Google Sheets is an adapter, not the core. New migrations should start from one characterized
workflow, keep its observable spreadsheet behavior stable, move business decisions into the core,
and isolate Apps Script services behind narrow ports. Unrelated workflows should not be pulled into
a slice merely because they share the same spreadsheet runtime.
