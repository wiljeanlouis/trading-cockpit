# Development workflow

## Prerequisites

- Node.js 20.19 or newer
- npm
- clasp authenticated for the existing Apps Script project

Google Apps Script remains the production runtime. The production sources are still JavaScript and
share the Apps Script global namespace.

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

Individual commands are also available:

```sh
npm run typecheck
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
clasp status
clasp push
```

Always inspect the Git diff and `clasp status` before pushing. Tooling, tests, and documentation are
excluded from Apps Script by `.claspignore`.

Do not add `clasp push` to automated checks or CI/CD without a separate architectural decision.
