# Trading Accounts foundation

## Domain and storage

A Trading Account is identity/configuration only: stable `id`, user-facing `name`, and explicit
`baseCurrency`. The `Accounts` sheet has exactly `Account ID`, `Name`, and `Base Currency`. Setup
creates headers but no sample or real accounts. `ALL` is rejected as an ID because consolidation is
a `PortfolioScope`, not a persisted account.

## Characterized single-account assumptions

1. Position previously had no account attribution; Position ID remains global identity.
2. Duplicate opening is one OPEN Position per Trade Plan ID.
3. `EXECUTED` is terminal and written immediately after Position append.
4. Trade Plan sizing snapshots one global Account Equity and Default Risk %.
5. Cockpit Config currency is global; accounts now make base currency explicit without conversion.
6. Journal previously attributed results only to Position/plan/watchlist/strategy.
7. Analytics reads Journal globally and has no account grouping.
8. Watchlist `ENTERED`/`CLOSED` describes a single workflow path and is ambiguous across accounts.
9. Reconciliation previously required no account to rebuild Journal.
10. Position formulas use fixed R/S/T columns; Journal formulas use T/U/V.
11. Menu execution previously required no account selection.

## Execution semantics

Trade Plan remains a single-execution instruction. One plan becomes `EXECUTED` after one Position,
so the duplicate invariant remains one OPEN Position per Trade Plan ID. Holding the same ticker in
several accounts is supported through distinct Trade Plans and globally unique Position IDs. No
`accountId + ticker` uniqueness rule exists.

This is deliberately conservative. Reusing one plan across accounts would require redesigning
`EXECUTED`, account-specific sizing, and global Watchlist transitions together. Phase 9 does not
introduce a TradeExecution aggregate or temporarily incorrect financial semantics.

## Migration

Account ID is appended at Z in Positions and AA in Journal. Repository access adds a missing header
but never fills historical rows. Users create real accounts through `Setup Trading Accounts`, then
manually attribute legacy rows. New opening prompts for Account ID and validates it against Accounts.
Close obtains account from Position; reconciliation blocks missing attribution.

## Known semantic gaps

Cockpit Config Account Equity and Default Risk % retain their existing global snapshot semantics.
They are neither total portfolio equity nor account-specific equity. Phase 10 must decide how each
account supplies sizing inputs before account-aware capital is introduced.

Watchlist remains a global idea/workflow status. It cannot express A1 closed while A3 remains open.
That lifecycle requires a later design; Phase 9 preserves current transitions.

Analytics and Dashboard remain global legacy consumers. Future queries should accept
`PortfolioScope = ALL | ACCOUNT(accountId)`. Additive measures such as realized P&L, market value,
cash, and exposure may be summed. Return %, win rate, average R, profit factor, and drawdown must be
recalculated for the selected scope rather than summed or naively averaged.

Future consolidated positions may group quantities by ticker and compute weighted average cost as
`sum(quantity * entry price) / sum(quantity)`. This belongs to a portfolio/query layer, not Position.
