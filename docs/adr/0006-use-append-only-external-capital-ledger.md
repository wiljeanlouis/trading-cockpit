# ADR 0006: Use an append-only external capital ledger

- Status: Accepted
- Date: 2026-08-27

## Context

Deposits and withdrawals change active-trading capital but are not trading performance. Storing them
as mutable account balance fields or Journal trades would destroy auditability and contaminate future
performance metrics.

## Decision

Represent INITIAL_FUNDING, DEPOSIT, and WITHDRAWAL as positive-amount, account-attributed,
append-only CapitalTransactions. Direction comes exclusively from type. Derive NetExternalCapital
per account and currency; do not treat it as cash, equity, or P&L.

## Consequences

External flows are auditable and isolated from trade results. Corrections, submission deduplication,
FX consolidation, current equity, cash availability, and performance-flow adjustment remain future
work. A Trading Account may have at most one INITIAL_FUNDING.
