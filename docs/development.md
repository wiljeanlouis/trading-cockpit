# Development workflow

## Prerequisites

- Node.js 20.19 or newer
- npm
- clasp authenticated for the existing Apps Script project

The repository root owns npm workspace orchestration. The Apps Script application lives under
`apps/sheets/`, the Node HTTP API under `apps/api/`, the React application under `apps/web/`,
runtime-neutral business/application code under `packages/core`, and serializable cross-runtime
contracts under `packages/contracts/`.

## Install

```sh
npm install
```

## Validate

Run the complete local baseline:

```sh
npm run check
```

The command runs TypeScript checks, ESLint, the scoped Prettier check, Vitest, and Apps Script
namespace/menu validation.

The tests build `apps/sheets/build/Cockpit.js` from the TypeScript module graph first. The bundle is
generated Apps Script runtime code and must not be edited directly. Frontend tests live under
`apps/web/tests/` and run independently in jsdom.

Individual commands are also available:

```sh
npm run typecheck
npm run build
npm run build:sheets
npm run build:api
npm run build:web
npm run lint
npm run format:check
npm test
npm run check:apps-script
```

Prettier intentionally ignores the legacy production `*.js` files. It applies to new tooling,
tests, and documentation until a separate formatting migration is approved.

## Tests

Run the test suite once:

```sh
npm test
```

Run it in watch mode:

```sh
npm run test:watch
```

## Frontend development

Start Vite from the repository root:

```sh
npm run dev
```

The local application uses `MockCockpitGateway`; its banner identifies the values as development
data. It does not need clasp or a live spreadsheet. The Cloud Run/HTTP deployment selects
`HttpCockpitGateway` and same-origin `/api/*` routes.

No periodic polling is enabled. The Dashboard loads once at mount and can be refreshed manually.

## Apps Script deployment

Deployment remains a manual, human-reviewed operation:

```sh
npm run deploy:prepare
clasp status
clasp push
```

Always inspect the Git diff and `clasp status` before pushing. Tooling, tests, and documentation are
excluded from Apps Script by `.claspignore`. Generated files under `apps/sheets/build/` are ignored by Git but
intentionally included by clasp. `npm run build` first creates the Apps Script JavaScript bundle,
then builds the React application under `apps/web/dist`. Frontend source, tests, Vite configuration, and the intermediate
`apps/web/dist/` tree are outside clasp's `apps/sheets` root.

The deployed runtime is transitional: JavaScript files at the `apps/sheets/` root own deferred features,
while `apps/sheets/build/Cockpit.js` contains migrated modular slices. Stable top-level wrappers in the bundle
keep menu and trigger names compatible with Apps Script. For the Watchlist slice, the menu still
calls `addSelectedToWatchlist`; that wrapper delegates to the modular implementation.

The first Web App request requires the bound Google Sheet to have been opened at least once after
deployment. `onOpen` registers its stable ID in Script Properties; Web App execution then uses that
ID because Apps Script has no active spreadsheet in web-app context.

Do not add `clasp push` to automated checks or CI/CD without a separate architectural decision.

## Google Sheets workbook setup

After installing or updating the Apps Script project, initialize a clean workbook from the Sheet UI:

1. reload the Spreadsheet so `onOpen` installs the menu;
2. run `Trading Cockpit → Setup → Initialize Trading Cockpit`;
3. complete any manual configuration reported by the setup, especially real trading accounts;
4. run `Trading Cockpit → Setup → Validate Trading Cockpit`;
5. require `VALID` before production use.

The setup is idempotent. It creates missing/empty required sheets, preserves canonical non-empty
data, and refuses non-empty incompatible schemas with `SCHEMA_MISMATCH`.

See [Google Sheets Data Contract V1](architecture/google-sheets-data-contract-v1.md) for the
canonical inventory.
