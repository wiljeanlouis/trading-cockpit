# TypeScript runtime workflow

## Current pipeline

Momentum scoring proves the production pipeline without changing the Apps Script architecture:

```text
MomentumScore.ts (strict TypeScript source)
  -> npm run build
MomentumScore.js (generated Apps Script runtime)
  -> manual clasp push
Google Apps Script V8
```

`MomentumScore.js` remains at the repository root so the existing flat clasp project and all global
consumers keep working unchanged. The generated file is committed and must not be edited directly.

## Why an external build is required

The installed clasp 3.4.0 explicitly no longer transpiles TypeScript. It selects supported local
extensions, reads their contents, maps them to Apps Script file types, and sends the source as-is.
Adding `.ts` to `scriptExtensions` would therefore classify TypeScript as server source without
removing its type syntax.

TypeScript compilation is sufficient for this proof of concept because `MomentumScore.ts` has no
imports or exports. Its emitted function declarations remain global Apps Script functions.

## Modules and a future bundler

Google Apps Script V8 does not provide a native ES module deployment model for project files. Once
the project introduces real `core/`, `ports/`, and `adapters/` modules with imports and exports, a
bundler will probably be required to remove module syntax and expose intentional global entry
points. That decision is deferred until the first module boundary exists.

No bundler is needed for the current global-script proof of concept.

## Validation and deployment

Validation builds and checks the runtime but never deploys it:

```sh
npm run check
```

Prepare and inspect a manual deployment with:

```sh
npm run deploy:prepare
```

Only after reviewing Git and clasp status should a developer run `clasp push` manually.

## Sources inspected

- Installed `@google/clasp` 3.4.0 README, migration section: “Drop typescript support”.
- Installed clasp 3.4.0 `build/src/core/files.js`: local files are read and uploaded without a
  transpilation stage.
- Installed clasp 3.4.0 `build/src/core/clasp.js`: `scriptExtensions` controls classification, not
  compilation.
- Google Apps Script V8 runtime documentation: <https://developers.google.com/apps-script/guides/v8-runtime>
- clasp 3.4.0 source: <https://github.com/google/clasp/tree/v3.4.0>
