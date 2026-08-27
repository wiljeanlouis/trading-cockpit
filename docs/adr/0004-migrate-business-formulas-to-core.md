# ADR 0004: Migrate business formulas progressively to the Core

- Status: Accepted
- Date: 2026-08-27

## Context

Trade Plan risk and position-sizing rules are implemented by six Google Sheets formulas. They are
observable business behavior, but their current location couples those rules to column letters and
prevents isolated testing. Replacing them immediately would combine architectural migration with a
runtime-calculation cutover.

## Decision

Business calculations belong in the Core. Migrate them progressively using pure TypeScript
functions and formula-parity tests.

During the validation period:

- the Core expresses Risk / Share, Reward / Share, Risk : Reward, Max Risk, Position Size, and
  Position Value;
- parity tests preserve blank, zero, negative, division, and floor semantics;
- the outbound mapper leaves calculated cells empty;
- the Google Sheets adapter continues installing the historical formulas;
- formula strings, ranges, and cell coordinates remain outside the Core.

Remove a historical formula only after representative Apps Script smoke tests and production-data
comparison demonstrate equivalence. Formula removal requires a separately reviewed cutover.

## Alternatives considered

### Keep all rules permanently in Google Sheets

This avoids a cutover but keeps business behavior dependent on spreadsheet coordinates and makes
automated tests incomplete.

### Replace all formulas immediately with computed values

This produces a single authority sooner but removes the simplest production parity oracle during
the first migration of the Trade Plan workflow.

### Duplicate formula strings in the Core

This would move persistence syntax rather than business rules. The Core would still depend on
Google Sheets concepts.

## Consequences

Positive consequences:

- Business calculations are explicit, deterministic, and independently tested.
- Existing spreadsheets retain their live recalculation behavior during validation.
- A later formula removal can be evidence-based and incremental.

Costs and risks:

- Core calculation results and Sheet formula results temporarily coexist.
- Production parity still requires manual comparison after deployment.
- Invalid nonnumeric Sheet edits can produce spreadsheet errors outside the typed Core boundary.
- The runtime authority remains Google Sheets until the later cutover is accepted.
