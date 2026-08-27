# Trade Plan Google Sheets schema

All 29 columns are physically editable because the sheet is not protected. “System” below describes
the intended ownership, not a Google Sheets permission. “Required” means required by the Create Trade
Plan legacy workflow; every header itself is required by schema validation.

| Column | Header             | Source                  | Conceptual type | Ownership             | Value or formula            | Intended editing | Creation requirement   |
| ------ | ------------------ | ----------------------- | --------------- | --------------------- | --------------------------- | ---------------- | ---------------------- |
| A      | Trade Plan ID      | Runtime UUID            | String          | Business identity     | Value                       | System           | Required               |
| B      | Watchlist ID       | Watchlist               | String          | Business traceability | Value                       | System           | Required               |
| C      | Strategy ID        | Watchlist snapshot      | String          | Business traceability | Uppercase value             | System           | Required               |
| D      | Strategy           | Watchlist snapshot      | String          | Business traceability | Value                       | System           | Required               |
| E      | Strategy Version   | Watchlist snapshot      | String          | Business traceability | Value                       | System           | Required               |
| F      | Signal Date        | Watchlist snapshot      | Date/string     | Business traceability | Value                       | System           | Optional               |
| G      | Signal Price       | Watchlist snapshot      | Number          | Business traceability | Value                       | System           | Optional               |
| H      | Ticker             | Watchlist snapshot      | String          | Business identity     | Uppercase value             | System           | Required               |
| I      | Reference Price    | Watchlist Current Price | Number          | Business snapshot     | Value                       | System           | Optional               |
| J      | Momentum Score     | Watchlist snapshot      | Number          | Business snapshot     | Value                       | System           | Optional               |
| K      | Setup Status       | Watchlist snapshot      | String          | Business snapshot     | Value                       | System           | Optional               |
| L      | Breakout Level     | Watchlist snapshot      | Number          | Business setup        | Value                       | System/user      | Optional               |
| M      | Invalidation Level | Watchlist snapshot      | Number-like     | Business setup        | Value                       | System/user      | Required nonblank      |
| N      | Event Risk         | Watchlist snapshot      | String          | Business setup        | Value                       | System/user      | Optional               |
| O      | Created At         | Runtime clock           | Date            | Business audit        | Value                       | System           | Required               |
| P      | Entry Type         | Default                 | Enum            | Business plan         | `BREAKOUT`                  | User dropdown    | Required/defaulted     |
| Q      | Entry Price        | User                    | Number          | Business plan         | Value                       | User             | Optional initially     |
| R      | Stop Price         | Invalidation Level      | Number-like     | Business plan         | Value                       | User             | Required/defaulted     |
| S      | Target Price       | User                    | Number          | Business plan         | Value                       | User             | Optional initially     |
| T      | Risk / Share       | Q, R                    | Number          | Derived business      | `IF(blank,"",Q-R)`          | Calculated       | Optional until Q/R     |
| U      | Reward / Share     | Q, S                    | Number          | Derived business      | `IF(blank,"",S-Q)`          | Calculated       | Optional until Q/S     |
| V      | Risk : Reward      | T, U                    | Number          | Derived business      | `IF(T blank or <=0,"",U/T)` | Calculated       | Optional               |
| W      | Account Equity     | Cockpit Config snapshot | Number          | Business sizing input | Value                       | System/user      | Required, > 0          |
| X      | Risk %             | Cockpit Config snapshot | Percentage      | Business sizing input | Value                       | System/user      | Required, > 0 and <= 1 |
| Y      | Max Risk $         | W, X                    | Number          | Derived business      | `IF(blank,"",W*X)`          | Calculated       | Calculated             |
| Z      | Position Size      | Y, T                    | Integer         | Derived business      | `IF(T<=0,"",FLOOR(Y/T,1))`  | Calculated       | Optional               |
| AA     | Position Value     | Z, Q                    | Number          | Derived business      | `IF(blank,"",Z*Q)`          | Calculated       | Optional               |
| AB     | Status             | Default                 | Enum            | Business workflow     | `DRAFT`                     | User dropdown    | Required/defaulted     |
| AC     | Notes              | User                    | String          | Business annotation   | Value                       | User             | Optional               |

Formatting and dropdown rules are presentation/persistence concerns. The six formulas in T, U, V,
Y, Z, and AA implement derived business rules, although their formula strings remain an adapter
concern.
