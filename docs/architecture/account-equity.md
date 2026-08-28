# Account equity and account-aware sizing

Trading Cockpit models active-trading capital, not the complete brokerage account. For one account:

```text
NetExternalCapital = INITIAL_FUNDING + DEPOSIT - WITHDRAWAL
RealizedPnl = sum(Journal.Realized P&L for accountId)
RealizedActiveTradingEquity = NetExternalCapital + RealizedPnl
```

Journal is authoritative for realized P&L. Position contains the source close result, but counting
both would double count. Deposits are not profit and withdrawals are not losses. A missing Initial
Funding blocks the query, as do invalid Journal P&L and non-positive derived equity.

`Current Price` is a GOOGLEFINANCE formula and has no freshness contract. Therefore mark-to-market
equity is unavailable (`null`), not zero. Fees and commissions are not modeled, so current realized
P&L is gross of unmodeled costs.

## Account-aware Trade Plan flow

```text
Watchlist -> choose account -> derive realized equity -> require account Risk % Per Trade
          -> create account-owned Trade Plan -> freeze sizing inputs -> open Position in same account
```

New plans use only account realized equity and account Risk % Per Trade. Missing policy blocks
creation; there is no fallback to Cockpit Config. Global Account Equity and Default Risk % remain
deprecated compatibility inputs for historical/legacy plans. Risk policy is managed by directly
editing `Accounts / Risk % Per Trade`, with Sheets validation and Core validation.

The sizing formula remains `Max Risk = Equity * Risk %` and
`Position Size = floor(Max Risk / Risk Per Share)`. This limits trade risk; it does not verify cash,
buying power, margin, existing exposure, or portfolio heat. Values are account-currency values. CAD
and USD are never aggregated and no FX is performed. Analytics and Dashboard remain legacy/global.
