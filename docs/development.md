# Development workflow

## Prerequisites

- Node.js 20.19 or newer
- npm
- clasp authenticated for the existing Apps Script project

Google Apps Script remains the production runtime. TypeScript is the maintained source for migrated
behavior; documented legacy JavaScript and the generated bundle share the Apps Script namespace.

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

The tests build `build/Cockpit.js` from the TypeScript module graph first. The bundle is generated
Apps Script runtime code and must not be edited directly.

Individual commands are also available:

```sh
npm run typecheck
npm run build
npm run build:cockpit
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

## Apps Script deployment

Deployment remains a manual, human-reviewed operation:

```sh
npm run deploy:prepare
clasp status
clasp push
```

Always inspect the Git diff and `clasp status` before pushing. Tooling, tests, and documentation are
excluded from Apps Script by `.claspignore`. Generated files under `build/` are ignored by Git but
intentionally included by clasp.

The deployed runtime is transitional: the root JavaScript files remain the legacy application,
while `build/Cockpit.js` contains migrated modular slices. Stable top-level wrappers in the bundle
keep menu and trigger names compatible with Apps Script. For the Watchlist slice, the menu still
calls `addSelectedToWatchlist`; that wrapper delegates to the modular implementation.

Do not add `clasp push` to automated checks or CI/CD without a separate architectural decision.
