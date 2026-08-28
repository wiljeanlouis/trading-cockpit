# Development workflow

## Prerequisites

- Node.js 20.19 or newer
- npm
- clasp authenticated for the existing Apps Script project

Google Apps Script remains the production runtime. TypeScript is the maintained source for migrated
behavior; documented legacy JavaScript and the generated bundle share the Apps Script namespace.
The repository root owns npm workspace orchestration. The Apps Script application lives under
`backend/`, the React application under `web/`, and serializable cross-runtime contracts under
`packages/contracts/`.

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

The tests build `backend/build/Cockpit.js` from the TypeScript module graph first. The bundle is
generated Apps Script runtime code and must not be edited directly. Frontend tests live under
`web/tests/` and run independently in jsdom.

Individual commands are also available:

```sh
npm run typecheck
npm run build
npm run build:cockpit
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
data. It does not need clasp or a live spreadsheet. Production builds select
`AppsScriptCockpitGateway`, which converts `google.script.run` callbacks into a Promise.

No periodic polling is enabled. The Dashboard loads once at mount and can be refreshed manually.

## Apps Script deployment

Deployment remains a manual, human-reviewed operation:

```sh
npm run deploy:prepare
clasp status
clasp push
```

Always inspect the Git diff and `clasp status` before pushing. Tooling, tests, and documentation are
excluded from Apps Script by `.claspignore`. Generated files under `backend/build/` are ignored by Git but
intentionally included by clasp. `npm run build` first creates the Apps Script JavaScript bundle,
then builds Vite as one inline HTML document and copies it to
`backend/build/CockpitWeb.html`. Frontend source, tests, Vite configuration, and the intermediate
`web/dist/` tree are outside clasp's `backend` root.

The deployed runtime is transitional: JavaScript files at the `backend/` root own deferred features,
while `backend/build/Cockpit.js` contains migrated modular slices. Stable top-level wrappers in the bundle
keep menu and trigger names compatible with Apps Script. For the Watchlist slice, the menu still
calls `addSelectedToWatchlist`; that wrapper delegates to the modular implementation.

The first Web App request requires the bound Google Sheet to have been opened at least once after
deployment. `onOpen` registers its stable ID in Script Properties; Web App execution then uses that
ID because Apps Script has no active spreadsheet in web-app context.

Do not add `clasp push` to automated checks or CI/CD without a separate architectural decision.
