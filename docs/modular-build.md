# Modular TypeScript build

## Why clasp is not enough

Clasp 3.4.0 selects and uploads local files but does not transpile TypeScript. Apps Script also does
not execute the project's files as native ES modules. TypeScript sources with imports and exports
therefore need to be bundled into a plain JavaScript runtime before deployment.

TypeScript remains responsible for strict typechecking. The bundler is responsible only for
resolving modules, removing TypeScript syntax, and producing Apps Script-compatible JavaScript.

## Tool choice

The modular build uses esbuild.

- It parses TypeScript without an additional plugin.
- It recursively bundles ESM imports and exports.
- Its `iife` output contains no runtime module statements.
- It supports tree shaking, multiple entrypoints, and optional source maps.
- Its JavaScript API keeps the Apps Script wrapper configuration explicit and testable.

Rollup can produce an equivalent IIFE and offers excellent control over library bundles. For this
repository it would also require a TypeScript plugin and more configuration without improving the
current result.

Esbuild does not typecheck TypeScript, so `npm run typecheck` continues to run `tsc --noEmit`.

## Source, build output, and deployment

```text
SOURCE
  src/**/*.ts
       |
       | npm run build:cockpit
       v
BUILD OUTPUT
  build/Cockpit.js
       |
       | clasp push (manual only)
       v
DEPLOYMENT
  Google Apps Script V8
```

`src/` is versioned and excluded from clasp. `build/` is generated and ignored by Git, but it is
intentionally not excluded from clasp.

The existing `.clasp.json` keeps `rootDir` at the repository root. This lets clasp deploy the 14
hand-maintained legacy JavaScript files and the generated modular bundle together without copying
files or changing their paths.

## Migrated slice module graph

```text
entrypoints/apps-script.ts
  -> composition/cockpit.ts
       -> adapters/inbound/google-sheets/add-selected-to-watchlist.ts
       -> adapters/inbound/google-sheets/create-trade-plan-from-selected-watchlist.ts
       -> adapters/inbound/google-sheets/execute-selected-trade-plan.ts
       -> adapters/outbound/apps-script/apps-script-runtime.ts
       -> adapters/outbound/google-sheets/google-sheets-strategy-repository.ts
       -> adapters/outbound/google-sheets/google-sheets-watchlist-repository.ts
            -> adapters/outbound/google-sheets/watchlist-mapper.ts
       -> adapters/outbound/google-sheets/google-sheets-trade-plan-repository.ts
            -> adapters/outbound/google-sheets/trade-plan-mapper.ts
       -> adapters/outbound/google-sheets/google-sheets-trading-configuration.ts
       -> adapters/outbound/google-sheets/google-sheets-position-repository.ts
            -> adapters/outbound/google-sheets/position-mapper.ts
       -> core/application/watchlist/add-candidate-to-watchlist.ts
            -> core/domain/watchlist.ts
            -> ports/outbound/runtime-port.ts
            -> ports/outbound/strategy-repository.ts
            -> ports/outbound/watchlist-repository.ts
       -> core/application/trade-plan/create-trade-plan-from-watchlist.ts
            -> core/domain/trade-plan.ts
            -> ports/outbound/trade-plan-repository.ts
            -> ports/outbound/trading-configuration-port.ts
       -> core/application/position/open-position-from-trade-plan.ts
            -> core/domain/position.ts
            -> ports/outbound/position-repository.ts
```

Ports are interfaces and are erased from the runtime. The use case depends only on these
interfaces. Google Sheets and Apps Script implementations live in outbound adapters; the selected
Momentum Ranking row is translated by an inbound adapter. Core and port modules contain no Apps
Script APIs.

## Global Apps Script entrypoint

An exported ESM function does not automatically become a global Apps Script function. Esbuild wraps
the entry module in an IIFE named `CockpitBundle`. The build adds an explicit top-level wrapper:

```js
function addSelectedToWatchlist() {
  return CockpitBundle.addSelectedToWatchlist();
}

function createTradePlanFromSelectedWatchlist() {
  return CockpitBundle.createTradePlanFromSelectedWatchlist();
}

function executeSelectedTradePlan() {
  return CockpitBundle.executeSelectedTradePlan();
}
```

This wrapper is the pattern for migrated menus and triggers: modular implementation inside the
bundle, minimal stable global function outside it.

## Testing and validation

Unit tests import the TypeScript modules directly. They do not load the Apps Script bundle or mock
Google services.

The bundle smoke test separately verifies that:

- the output is valid JavaScript;
- no static import or export statement remains;
- `CockpitBundle` and all three migrated menu wrappers exist globally;
- the generated wrappers delegate to their bundled entrypoints.

The lightweight architecture check rejects Apps Script globals in core and port modules and rejects
dependencies from core or ports toward adapters.

Run the complete validation with:

```sh
npm run check
```

## Preparing a deployment

```sh
npm run deploy:prepare
```

This builds, validates, and prints clasp status. It never pushes. After review, `clasp push` remains a
separate manual command.

The expected clasp runtime is:

- 6 hand-maintained legacy JavaScript files at the repository root;
- `build/Cockpit.js`;
- `appsscript.json`.

## Source maps

Source maps are disabled. The current Apps Script deployment and log workflow does not consume local
source maps, and deploying them would add an unusable artifact. They can be reconsidered if a future
error-reporting workflow maps generated stack traces back to TypeScript.

## Future migration

Watchlist, Trade Plan, Position, Journal, Strategy/setup, account capital/equity, Momentum, and
market-signal workflows are migrated under `core/`, `ports/`, and `adapters/`. Their physical Sheets
schemas and formulas are adapter-owned. Analytics, Dashboard, Theme, and Documentation remain
independent future migrations behind characterization tests.

Each future slice should keep its stable Apps Script menu or trigger wrapper, introduce only the
ports required by its use case, and preserve spreadsheet schemas and observable behavior during the
cutover.
