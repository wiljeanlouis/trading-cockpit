# ADR 0007: Use derived realized equity for account-owned Trade Plans

- Status: Accepted
- Date: 2026-08-27

## Context

Account-aware sizing needs an account before risk can be calculated. NetExternalCapital alone is not
equity, Position Current Price is an externally refreshed GOOGLEFINANCE value without a freshness
guarantee, and both Position and Journal contain the result of a closed trade.

## Decision

Trade Plans are owned by one Trading Account and snapshot that account's derived realized active-
trading equity and Risk % Per Trade at creation. Realized equity is NetExternalCapital plus realized
P&L from Journal. Journal is authoritative because it is the immutable closed-trade snapshot;
Position is not counted again. Equity is derived on demand and never persisted as a mutable account
balance. Mark-to-market equity is explicitly unavailable until price freshness is authoritative.

Open Position derives account ownership from TradePlan.accountId. Historical Trade Plans retain a
blank Account ID and cannot be executed until explicitly migrated.

## Consequences

New Trade Plans no longer use global Account Equity or Default Risk %. Those legacy values remain for
historical rows and legacy code only. Sizing is auditable because Account ID, Account Equity, Risk %,
Max Risk, Risk / Share, and Position Size are frozen on the plan. This is risk sizing, not a statement
of available cash or buying power. Fees, portfolio heat, FX, and Analytics/Dashboard migration remain
future work.
