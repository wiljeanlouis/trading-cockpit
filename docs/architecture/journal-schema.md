# Journal Google Sheets schema

Journal is one trade-result snapshot per Position ID, followed by calculated metrics and editable
review annotations. All 26 headers are required. The sheet is not protected, so ownership below is
conceptual rather than an enforced permission.

| Column | Header           | Source                   | Conceptual type | Responsibility           | Value/formula                                     | Editing    | Required              |
| ------ | ---------------- | ------------------------ | --------------- | ------------------------ | ------------------------------------------------- | ---------- | --------------------- |
| A      | Journal ID       | Runtime UUID             | String          | Journal identity         | Value                                             | System     | Yes                   |
| B      | Position ID      | Position                 | String          | Idempotence/traceability | Snapshot                                          | System     | Yes                   |
| C      | Trade Plan ID    | Position                 | String          | Traceability             | Snapshot                                          | System     | Yes                   |
| D      | Watchlist ID     | Position                 | String          | Traceability             | Snapshot                                          | System     | Yes                   |
| E      | Strategy ID      | Position                 | String          | Strategy identity        | Uppercase snapshot                                | System     | Yes                   |
| F      | Strategy         | Position                 | String          | Strategy label           | Snapshot                                          | System     | Yes                   |
| G      | Strategy Version | Position                 | String          | Historical strategy      | Snapshot                                          | System     | Yes                   |
| H      | Ticker           | Position                 | String          | Instrument               | Uppercase snapshot                                | System     | Yes                   |
| I      | Opened At        | Position                 | Date            | Execution audit          | Snapshot                                          | System     | Optional legacy value |
| J      | Closed At        | Close workflow           | Date            | Execution audit          | Snapshot                                          | System     | Yes at creation       |
| K      | Planned Entry    | Position                 | Number-like     | Plan intent              | Snapshot                                          | System     | Optional              |
| L      | Actual Entry     | Position                 | Number-like     | Execution fact           | Snapshot                                          | System     | Optional legacy value |
| M      | Exit Price       | Close workflow           | Number          | Execution fact           | Snapshot                                          | System     | Yes at creation       |
| N      | Quantity         | Position Actual Quantity | Number-like     | Execution fact           | Snapshot                                          | System     | Optional legacy value |
| O      | Initial Stop     | Position                 | Number-like     | Initial risk snapshot    | Snapshot                                          | System     | Optional              |
| P      | Target           | Position                 | Number-like     | Plan target snapshot     | Snapshot                                          | System     | Optional              |
| Q      | Planned Max Risk | Position                 | Number-like     | Planned risk snapshot    | Snapshot                                          | System     | Optional              |
| R      | Planned R:R      | Position                 | Number-like     | Planned reward snapshot  | Snapshot                                          | System     | Optional              |
| S      | Realized P&L     | Close workflow           | Number-like     | Trade result             | Snapshot                                          | System     | Produced at close     |
| T      | Return %         | M/L                      | Percentage      | Derived business metric  | `IF blank, blank; M/L-1`                          | Calculated | Optional              |
| U      | R-Multiple       | S/Q                      | Number          | Derived business metric  | blank if Q blank/nonpositive or S blank; else S/Q | Calculated | Optional              |
| V      | Outcome          | S                        | Enum            | Derived result           | WIN/LOSS/BREAKEVEN                                | Calculated | Optional              |
| W      | Exit Reason      | User after close         | Enum/text       | Review annotation        | Initially blank; dropdown allows invalid          | User       | Optional              |
| X      | Execution Notes  | User after close         | String          | Review annotation        | Initially blank                                   | User       | Optional              |
| Y      | Lessons Learned  | User after close         | String          | Review annotation        | Initially blank                                   | User       | Optional              |
| Z      | Followed Plan?   | User after close         | Enum/text       | Review annotation        | Initially blank; YES/PARTIALLY/NO                 | User       | Optional              |

Current Stop is not copied. Exit Reason is not derived from Position status, stop, target, or exit
price. Analytics remains legacy and reads Position ID, Strategy ID, Strategy, Strategy Version,
Realized P&L, and R-Multiple by header; this schema preserves that contract.

Core functions express Return %, R-Multiple, and Outcome for testing. Google Sheets formulas remain
the runtime persisted values during the parity period. A zero Actual Entry yields the historical
division error; blank or nonpositive Planned Max Risk yields blank R-Multiple.

The duplicate invariant is one Journal row per trimmed, case-sensitive Position ID. It is enforced
by lookup before UUID generation and append, but not by a database uniqueness constraint. Concurrent
executions and cross-sheet partial failures therefore remain possible.

Reconciliation queries all rows for a Position ID so it can distinguish zero, one, and multiple
matches. Zero can be repaired from a sufficiently complete persisted `CLOSED` Position; one is
already valid; multiple matches require manual review and are never deleted or merged automatically.
Reconciled rows use the same mapper, formulas, formats, validations, and theme as normal close rows,
so the Analytics contract remains identical.
