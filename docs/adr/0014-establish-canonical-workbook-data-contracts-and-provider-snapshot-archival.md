# ADR 0014: Establish canonical workbook data contracts and provider snapshot archival

- Status: Accepted
- Date: 2026-08-31

## Context

Historical Google Sheets layouts mixed presentation rows, metadata rows, headers, and records. That
made API readers fragile and prevented a generic table-reading convention. Trading Cockpit also
needs historical provider observations because Finviz does not provide the historical snapshots the
application needs.

## Decision

Backend DATA sheets and tabular CONFIG sheets use Google Sheets Data Contract V1:

- row 1 contains stable headers;
- row 2 and below contain records;
- no title, metadata, blank structural rows, or merged cells appear inside data tables;
- one record is stored per row and one field per column.

Workbook initialization and validation are reproducible. Non-empty incompatible schemas are rejected
instead of silently interpreted through fallback layouts.

Signals History archives the complete configured Finviz CSV snapshot plus explicit Trading Cockpit
metadata. It is not limited to the subset consumed by Momentum Ranking. The provider CSV field
`Ticker` is archived as `Finviz Ticker` to avoid colliding with Trading Cockpit's business `Ticker`.
Momentum Ranking is a derived strategy-specific projection.

## Consequences

Cloud Run readers and Apps Script adapters can use a consistent table convention. Provider data is
available for future historical analysis without redefining Momentum Ranking as the archive.
Workbook migrations must be deliberate and backed up because incompatible non-empty schemas are not
auto-repaired.
