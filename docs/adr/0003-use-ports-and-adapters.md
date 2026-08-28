# ADR 0003: Use Ports and Adapters for progressive business-slice migration

- Status: Accepted
- Date: 2026-08-27

## Context

Trading Cockpit is a Google Apps Script application whose JavaScript files share one global
namespace and directly combine spreadsheet access, business decisions, formatting, and user
interaction. Rewriting the application at once would put working spreadsheet behavior and data
contracts at risk. The modular TypeScript build is already able to coexist with the legacy runtime,
so business behavior can instead move one vertical slice at a time.

The first slice is adding the selected Momentum Ranking candidate to the Watchlist. It includes
normalization, validation, strategy existence, duplicate detection, entry creation, spreadsheet
mapping, formulas, formatting, and toasts.

## Decision

Use a Ports and Adapters architecture for migrated business slices.

- Domain and application modules contain business rules and use cases.
- Outbound ports describe only the external capabilities required by a use case.
- Inbound adapters translate Apps Script interactions into application commands and results.
- Outbound adapters implement ports with Google Sheets and Apps Script services.
- A composition root constructs adapters and injects them into use cases.
- Generated top-level wrappers preserve existing Apps Script menu and trigger function names.
- Each slice is characterized before extraction and is migrated independently.

Google Sheets is an adapter, not the core. Sheet names, ranges, row arrays, formulas, formatting,
toasts, `SpreadsheetApp`, and `Utilities` must remain outside domain and application modules.

## Alternatives considered

### Keep adding behavior to global JavaScript files

This has the lowest immediate build cost, but retains implicit dependencies, makes isolated tests
difficult, and increases the blast radius of changes in the shared Apps Script namespace.

### Rewrite the complete application before another feature

This could produce a uniform architecture sooner, but creates a large behavioral cutover and makes
regressions hard to localize. It also delays value until every workflow and spreadsheet contract is
migrated.

### Use a service locator or dependency-injection framework

This would centralize dependency lookup but adds runtime machinery and hides dependencies for a
small Apps Script application. Manual composition is explicit and sufficient.

### Put Google Sheets repositories directly in the application layer

This reduces the number of files but prevents business rules from being tested without Apps Script
and makes the spreadsheet schema part of the core model.

## Consequences

Positive consequences:

- Business rules can be tested with in-memory port implementations.
- Spreadsheet schemas and Apps Script globals have explicit adapter boundaries.
- Existing menu contracts can remain stable during incremental cutovers.
- Each migration has a limited and reviewable blast radius.

Costs and risks:

- The repository temporarily contains both legacy and modular implementations.
- Boundary mappers and manual wiring add files and concepts.
- Shared legacy presentation helpers may remain implicit dependencies until their own migration.
- Every slice requires characterization and parity checks before activating its wrapper.

The Watchlist slice establishes the pattern; it does not authorize migrating adjacent workflows
without their own scope and tests.
