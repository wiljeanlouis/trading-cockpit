# Position Google Sheets schema

All 25 columns are physically editable because the sheet is not protected. “System” below describes
intended ownership, not a Google Sheets permission. Every header is required by schema validation.

| Column | Header           | Source                   | Conceptual type | Ownership                 | Value or formula   | Intended editing     | Opening requirement              |
| ------ | ---------------- | ------------------------ | --------------- | ------------------------- | ------------------ | -------------------- | -------------------------------- |
| A      | Position ID      | Runtime UUID             | String          | Business identity         | Value              | System               | Required                         |
| B      | Trade Plan ID    | Trade Plan               | String          | Business identity         | Snapshot           | System               | Required                         |
| C      | Watchlist ID     | Trade Plan               | String          | Traceability              | Snapshot           | System               | Required                         |
| D      | Strategy ID      | Trade Plan               | String          | Traceability              | Uppercase snapshot | System               | Required                         |
| E      | Strategy         | Trade Plan               | String          | Traceability              | Snapshot           | System               | Required                         |
| F      | Strategy Version | Trade Plan               | String          | Traceability              | Snapshot           | System               | Required                         |
| G      | Ticker           | Trade Plan               | String          | Business identity         | Uppercase snapshot | System               | Required                         |
| H      | Opened At        | Runtime clock            | Date            | Execution audit           | Value              | System               | Required                         |
| I      | Planned Entry    | Trade Plan Entry Price   | Number-like     | Plan intent               | Snapshot           | System               | Required nonblank                |
| J      | Actual Entry     | Numeric conversion of I  | Number          | Execution fact            | Value              | System/broker future | Derived at opening               |
| K      | Planned Quantity | Trade Plan Position Size | Number-like     | Plan intent               | Snapshot           | System               | Required, numeric conversion > 0 |
| L      | Actual Quantity  | Numeric conversion of K  | Number          | Execution fact            | Value              | System/broker future | Derived at opening               |
| M      | Initial Stop     | Trade Plan Stop Price    | Number-like     | Plan intent               | Snapshot           | System               | Required nonblank                |
| N      | Current Stop     | Initial Stop             | Number-like     | Position management       | Value              | User/system future   | Defaulted                        |
| O      | Target           | Trade Plan Target Price  | Number-like     | Plan intent               | Snapshot           | User                 | Optional                         |
| P      | Planned Max Risk | Trade Plan Max Risk $    | Number-like     | Plan intent               | Snapshot           | System               | Optional                         |
| Q      | Planned R:R      | Trade Plan Risk : Reward | Number-like     | Plan intent               | Snapshot           | System               | Optional                         |
| R      | Current Price    | GOOGLEFINANCE            | Number          | Persistence/external data | Formula            | Calculated           | Optional/live                    |
| S      | Unrealized P&L   | R, J, L                  | Number          | Derived business          | Formula `(R-J)*L`  | Calculated           | Optional/live                    |
| T      | Unrealized P&L % | R, J                     | Percentage      | Derived business          | Formula `R/J-1`    | Calculated           | Optional/live                    |
| U      | Status           | Default/workflow         | Enum            | Business workflow         | `OPEN`             | Dropdown             | Required/defaulted               |
| V      | Closed At        | Close workflow           | Date            | Execution audit           | Value              | System               | Empty at opening                 |
| W      | Exit Price       | Close workflow           | Number          | Execution fact            | Value              | System/user          | Empty at opening                 |
| X      | Realized P&L     | Close workflow           | Number          | Derived business          | Value              | System               | Empty at opening                 |
| Y      | Notes            | User                     | String          | Annotation                | Value              | User                 | Optional                         |

Position contains no Position Value, actual-risk, slippage, or account-allocation column. Those
metrics are not introduced by the Open Position migration because the legacy does not calculate or
persist them.

The Unrealized P&L % formula does not guard an Actual Entry of zero and therefore produces a Sheets
division error. The Core parity function represents this explicitly as `DIVISION_BY_ZERO`; it does
not silently normalize the legacy edge case.
