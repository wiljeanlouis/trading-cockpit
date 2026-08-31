# ADR 0009: Treat external market signal providers as adapters

- Status: Accepted, amended by ADR 0012 and ADR 0014
- Date: 2026-08-28

## Context

Trading Cockpit currently obtains screener data from Finviz. The first TypeScript migration named
domain values, application use cases, and outbound ports after that provider. This made the current
transport and vendor vocabulary part of the Core contract even though the application only needs
market signals associated with a trading strategy.

The general Ports and Adapters rule in ADR 0003 establishes dependency direction, but it does not
explicitly decide whether an external provider may define a Core capability. This provider boundary
is durable and applies to any future market signal source.

## Decision

External provider names must not become domain concepts merely because they are the current
implementation.

The Core expresses provider-neutral market signal batches, feeds, and strategy snapshots. The
application refreshes market signals through `MarketSignalSource`, projects them through
`MarketSignalProjection`, and archives them through `SignalHistoryRepository`. A provider adapter
translates its URL, query language, authentication, HTTP behavior, transport representation, and
errors into these contracts before data enters provider-neutral logic.

Finviz remains the only configured implementation. Its token storage and management, HTTP and CSV
transport, feed query, provider errors, Google Sheets projection name, inbound UI, composition, and
Apps Script callbacks remain explicitly Finviz-specific at the adapter and infrastructure boundary.
Provider selection and generic credential abstractions are not introduced.

## Consequences

- Momentum and Signals History consume business signal representations rather than Finviz rows.
- A fake `MarketSignalSource` can exercise the refresh use case without Finviz or Apps Script.
- Replacing or adding a provider does not require changing domain or application contracts.
- The physical `Finviz - Momentum` sheet, `Refresh Finviz` menu label, and public Finviz callbacks
  remain compatible.
- Architecture checks reject provider names under `backend/src/core` and `backend/src/ports`.
- Provider-specific integration tests remain alongside provider-neutral application tests.
