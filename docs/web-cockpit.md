# React web cockpit

## Boundary

React is an inbound adapter. Components depend on `CockpitGateway`; only
`AppsScriptCockpitGateway` may use `google.script.run`. The backend entrypoint delegates to an
application use case and a Google Sheets repository. React knows neither sheet names nor columns.

```text
Browser
  -> React Dashboard
  -> CockpitGateway
  -> AppsScriptCockpitGateway
  -> google.script.run.getDashboardSummary
  -> Apps Script global wrapper
  -> GetDashboardSummary
  -> GoogleSheetsDashboardSummaryRepository
  -> source sheets
```

## Dashboard contract

`DashboardSummaryDto` is maintained in `packages/contracts`. It carries an ISO `generatedAt` value
and six currency-neutral workflow counts:

- signals: rows in the current Momentum Ranking projection;
- watchlist: rows having a ticker;
- ready: Watchlist rows in `READY` status;
- active trade plans: Trade Plan rows in `DRAFT` or `READY` status;
- open positions: Position rows in `OPEN` status;
- closed trades: Journal rows having a Position ID.

The repository reads these source sheets on every request. It does not depend on the materialized
legacy Dashboard sheet or require `Refresh Dashboard`. Financial values were deliberately omitted:
the legacy global Dashboard does not yet provide an unambiguous account/currency scope for the Web
UI.

## Spreadsheet registration

Apps Script does not provide an active spreadsheet when a bound script runs as a Web App. The Sheet
`onOpen` callback therefore records the bound spreadsheet ID in Script Properties. Dashboard Web
App calls open that registered file by stable ID. No row, range, or spreadsheet object crosses the
application or browser boundary. If registration is missing, the endpoint returns an actionable
error asking the user to open the Sheet once.

## Local development

Run `npm run dev`. Vite selects `MockCockpitGateway` and shows a development-data banner. The mock is
small and explicit; it does not simulate Sheets or Apps Script.

Production selects `AppsScriptCockpitGateway`. It supports automatic load at mount, manual refresh,
loading, failure/retry, and the timestamp of the last successful backend response. Polling is not
enabled in Phase 12.

## HtmlService build

`npm run build:web` uses Vite and `vite-plugin-singlefile` to inline JavaScript and CSS into one HTML
file. A post-build script copies that file to `backend/build/CockpitWeb.html`. `doGet` serves it with
HtmlService. This avoids unsupported static asset routing and external runtime dependencies.

Use this deployment workflow:

```sh
npm run check
npm run deploy:prepare
clasp push
```

`clasp push` remains a separately authorized manual action. Open the bound Sheet once after a new
deployment before smoke-testing the Web App.

## Future features

Google Sheets remains a supported interface. Future Web UI slices should reuse the gateway boundary
and backend use cases. Administration belongs under `web/src/features/admin/`; it will not be a
separate SPA. Watchlist, Trade Plan, Position, Journal, Analytics, and Administration UIs are not
implemented in Phase 12.
