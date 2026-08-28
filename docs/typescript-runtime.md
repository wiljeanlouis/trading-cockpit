# TypeScript runtime workflow

## Current pipeline

```text
backend/src/**/*.ts
  -> TypeScript validation
  -> esbuild IIFE bundle
backend/build/Cockpit.js
  -> manual clasp push
Google Apps Script V8
```

TypeScript is the maintained source for migrated workflows. `backend/build/Cockpit.js` is generated and must
not be edited directly. Stable trigger and menu callbacks are appended by the build script; internal
TypeScript functions remain inside `CockpitBundle`.

Google Apps Script V8 does not execute TypeScript or provide native ES modules. The bundle removes
module syntax while preserving the adapters' access to Apps Script globals. JavaScript files at the
`backend/` root are temporary legacy modules listed in the architecture inventory.

Validation and deployment preparation never deploy:

```sh
npm run check
npm run deploy:prepare
```

Only a separately reviewed `clasp push` performs deployment.
