# Google Sheets Data Contract V1

React + Cloud Run is the primary Trading Cockpit application. Google Sheets remains the
persistence/source-of-truth layer and a supported administration interface.

## DATA table contract

Backend DATA sheets and naturally tabular CONFIG sheets use one physical convention:

- row 1 contains stable headers;
- row 2 and below contain records;
- no title, metadata, blank structural rows, or merged cells appear inside the data table;
- one record is stored per row and one field per column;
- formatting may help readability but must not move the table.

Non-empty sheets with incompatible headers are invalid. Current setup does not guess historical
layouts or perform automatic migrations.

## Installation workflow

1. Install or update Apps Script.
2. Reload the Spreadsheet.
3. Run `Trading Cockpit → Setup → Initialize Trading Cockpit`.
4. Complete manual configuration reported by the setup.
5. Run `Trading Cockpit → Setup → Validate Trading Cockpit`.
6. Use the workbook only after validation reports `VALID`.

## Canonical workbook inventory

| Sheet                 | Classification  | Contract                      | Notes                                                                                                                          |
| --------------------- | --------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Momentum Ranking      | DATA            | row 1 headers / row 2 records | Normalized data projection for ranked Momentum candidates.                                                                     |
| Watchlist             | DATA            | row 1 headers / row 2 records | Authoritative Watchlist persistence with Sheet validations/formulas.                                                           |
| Trade Plans           | DATA            | row 1 headers / row 2 records | Authoritative Trade Plan persistence.                                                                                          |
| Positions             | DATA            | row 1 headers / row 2 records | Authoritative Position persistence.                                                                                            |
| Journal               | DATA            | row 1 headers / row 2 records | Authoritative closed-trade history.                                                                                            |
| Capital Ledger        | DATA            | row 1 headers / row 2 records | Append-only capital transactions.                                                                                              |
| Signals History       | DATA            | row 1 headers / row 2 records | Signal archive with complete deterministic headers: base signal metadata plus the current Momentum Breakout signal attributes. |
| Strategies            | CONFIG          | row 1 headers / row 2 records | Seeds the default Momentum Breakout strategy once.                                                                             |
| Accounts              | CONFIG          | row 1 headers / row 2 records | Creates headers only. The user must enter real accounts and `Risk % Per Trade`.                                                |
| Cockpit Config        | CONFIG          | row 1 headers / row 2 records | Legacy/global compatibility configuration.                                                                                     |
| Momentum Score Config | CONFIG          | row 1 headers / row 2 records | Human-readable scoring reference with contiguous `Component`, `Condition`, `Points`, `Max` rows.                               |
| Finviz - Momentum     | TECHNICAL       | row 1 headers / row 2 records | Current provider projection, not a business source of truth.                                                                   |
| Dashboard             | OPTIONAL_REPORT | generated report              | Not required for React/API correctness.                                                                                        |
| Analytics             | OPTIONAL_REPORT | generated report              | Not required for React/API correctness.                                                                                        |
| Documentation         | OPTIONAL_REPORT | generated utility             | Not required for React/API correctness.                                                                                        |
| Lists                 | LEGACY_UNUSED   | none                          | Not recreated by canonical setup.                                                                                              |
| Finviz Screener       | LEGACY_UNUSED   | none                          | Not recreated by canonical setup.                                                                                              |

## Setup behavior

`Initialize Trading Cockpit`:

- creates absent required sheets;
- initializes existing empty required sheets;
- preserves canonical non-empty sheets and their data;
- seeds required defaults once;
- reports manual account configuration;
- fails safely with `SCHEMA_MISMATCH` for incompatible non-empty sheets.

`Validate Trading Cockpit` is read-only. It checks required sheet presence, canonical row-1 headers,
required config rows, and known config exceptions without writing, formatting, or repairing.
