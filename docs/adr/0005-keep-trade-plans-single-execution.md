# ADR 0005: Keep Trade Plans single-execution during multi-account foundation

- Status: Accepted
- Date: 2026-08-27

## Context

Trade Plan embeds sizing based on a global equity snapshot, becomes `EXECUTED` after Position
creation, and drives one global Watchlist lifecycle. Reusing it across accounts would make all three
semantics ambiguous.

## Decision

Trade Plan remains a single-execution instruction. Opening requires a Trading Account and creates
one account-attributed Position. The same security may be held in several accounts by using distinct
Trade Plans. Position ID remains primary identity; no account/ticker uniqueness rule is added.

## Consequences

Multi-account ownership is available without redefining existing lifecycle behavior. A single plan
cannot yet be executed into several accounts. Supporting that later requires a coordinated design
for account-aware sizing, execution state, and Watchlist semantics, potentially including an explicit
execution concept only if future evidence justifies it.
