# ADR 0002: Use a modular TypeScript build

## Status

Accepted

## Context

Trading Cockpit is deployed to Google Apps Script with clasp 3.4.0. Clasp no longer transpiles
TypeScript, and Apps Script project files cannot consume the ESM imports and exports needed for a
future Ports & Adapters architecture.

The repository must support a gradual coexistence period: legacy JavaScript remains deployable while
new TypeScript modules use strict contracts and standard imports. Global Apps Script functions must
remain discoverable for menus and triggers.

## Decision

Use esbuild to bundle modular TypeScript entrypoints into non-minified IIFE JavaScript files under
`build/`.

- TypeScript sources live under `src/` and are excluded from clasp.
- Generated `build/` output is ignored by Git but included by clasp.
- The existing repository-root `rootDir` remains unchanged during coexistence.
- `tsc --noEmit` performs strict typechecking independently of esbuild.
- Each Apps Script entrypoint is exposed by an explicit top-level wrapper function added by the build.
- Unit tests import source modules directly; separate smoke tests execute the generated bundle.
- Source maps remain disabled until a consumer for them exists.

At acceptance time, MomentumScore remained on a side-by-side `tsc` pipeline. Phase 11.6 subsequently
migrated it into the modular bundle under the source policy established by ADR 0008.

## Alternatives Considered

### Direct TypeScript through clasp

Rejected because clasp 3.4.0 uploads source without transpiling TypeScript or resolving modules.

### TypeScript compiler without a bundler

Retained temporarily for the non-modular MomentumScore file, but rejected for future modules because
the emitted imports and exports would not form an Apps Script-compatible runtime.

### Rollup with its TypeScript plugin

Technically valid and capable of IIFE output, tree shaking, multiple entrypoints, and source maps.
Not selected because it requires an additional TypeScript integration plugin and more configuration
than esbuild for this repository's current needs.

### Copy all legacy files into a deployment directory

Rejected during coexistence because it duplicates 20 files at every build and increases deployment
risk without improving the modular POC.

## Consequences

Positive consequences:

- Source modules can use real imports, exports, interfaces, and type-only imports.
- Apps Script receives one plain JavaScript file per modular entrypoint.
- Legacy files and modular output deploy together without changing their current paths.
- Global functions are explicit and auditable.
- The build remains small and fast.

Trade-offs:

- Generated bundles must exist before `clasp push`.
- Typechecking and bundling remain two separate operations.
- Global wrappers must be maintained as part of the build configuration.
- The temporary deployment layout mixes root legacy files and generated files under `build/`.
- Apps Script stack traces refer to generated JavaScript while source maps are disabled.
