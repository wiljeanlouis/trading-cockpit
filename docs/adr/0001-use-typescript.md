# ADR 0001: Adopt TypeScript progressively

## Status

Accepted

## Context

Trading Cockpit currently runs as JavaScript in the Google Apps Script V8 runtime. Production files
share the Apps Script global namespace and are deployed with clasp. A future Ports & Adapters
architecture will need explicit contracts for use cases, repositories, and external providers.

A big-bang conversion would combine toolchain risk, language migration, and business refactoring in
one change. That would make the working Google Sheets application harder to validate and roll back.

## Decision

Trading Cockpit adopts TypeScript progressively.

- Existing production JavaScript remains unchanged during the engineering-baseline phase.
- TypeScript provides local typechecking and is used for new tests first.
- Legacy JavaScript is included with `allowJs` but not fully checked with `checkJs` yet.
- Production files will be converted in later, independently reviewed phases.
- Google Apps Script remains the current runtime and global menu/trigger functions remain available.
- No bundler is introduced while production remains directly deployable JavaScript.
- A bundler may be reconsidered when a second runtime or ES module source becomes necessary.

## Consequences

Positive consequences:

- Future ports and use cases can gain explicit contracts incrementally.
- Pure domain logic can be tested in a standard JavaScript runtime.
- The current Apps Script deployment remains unchanged.
- Migration commits can stay small and reversible.

Trade-offs:

- The legacy JavaScript does not receive full TypeScript checking immediately.
- Apps Script global namespace constraints still apply.
- JavaScript and TypeScript will coexist during the migration.
- Strict TypeScript options must be strengthened as production files are converted.
