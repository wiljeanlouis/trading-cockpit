# Active Trading Capital Ledger

Trading Cockpit models only capital externally allocated to active trading, not the complete broker
account. `INITIAL_FUNDING`, `DEPOSIT`, and `WITHDRAWAL` are external flows and are never trading P&L,
Journal entries, outcomes, or R-Multiples.

## Physical schema

The append-only `Capital Ledger` sheet has six columns:

| Column | Header         | Meaning                                           |
| ------ | -------------- | ------------------------------------------------- |
| A      | Transaction ID | Stable globally unique runtime UUID               |
| B      | Account ID     | Owning Trading Account                            |
| C      | Type           | INITIAL_FUNDING, DEPOSIT, or WITHDRAWAL           |
| D      | Amount         | Strictly positive amount in account base currency |
| E      | Occurred At    | Effective timestamp                               |
| F      | Note           | Optional user annotation                          |

There are no update/delete operations. Phase 10 has no reversal workflow, deduplication token, or
cross-row lock. A second user submission creates a second transaction even though UUIDs remain unique.
A Trading Account may have at most one INITIAL_FUNDING.

## Derived facts

For one account:

```text
NetExternalCapital = InitialFunding + Deposits - Withdrawals
```

`AccountCapitalSummary` exposes initial funding, total deposits, total withdrawals, net external
capital, and base currency. It does not expose cash, equity, buying power, market value, exposure, or
performance. Withdrawals are not constrained by net contributions because actual available cash is
not yet authoritative.

CAD and USD summaries remain separate. `PortfolioScope.ALL` cannot aggregate monetary amounts until
an explicit FX policy exists.

## Future equity

Conceptually, future active-trading equity will require external capital, closed-trade results, and
open-position valuation. Phase 10 deliberately does not implement that equation and does not replace
legacy Account Equity with NetExternalCapital.
