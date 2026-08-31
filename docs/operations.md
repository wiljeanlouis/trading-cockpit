# Trading Cockpit Operations

This document is the authoritative current operational runbook. Architecture rationale lives in
[architecture](architecture.md) and [ADRs](adr/README.md).

## 1. Prerequisites

- Node.js 20.19 or newer
- npm
- Google Cloud CLI for Cloud Run operations
- clasp authenticated for Apps Script operations
- Access to the Trading Cockpit Google Sheet and Google Cloud project

Do not store credentials, Finviz tokens, service-account keys, or spreadsheet IDs in source files.

## 2. Local Development

Install dependencies from the repository root:

```sh
npm install
```

Start the React development UI:

```sh
npm run dev
```

Start the API workspace locally when validating HTTP behavior:

```sh
TRADING_COCKPIT_SPREADSHEET_ID=<spreadsheet-id> npm run dev --workspace @trading-cockpit/api
```

Local Google Sheets API access uses Application Default Credentials:

```sh
gcloud auth application-default login
gcloud auth application-default set-quota-project <project-id>
```

## 3. Validation

Root commands are defined in `package.json`.

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run check
npm run deploy:prepare
```

Scoped commands:

```sh
npm run typecheck:core
npm run typecheck:sheets
npm run typecheck:contracts
npm run typecheck:api
npm run typecheck:web
npm run test:core
npm run test:sheets
npm run test:api
npm run test:web
npm run build:sheets
npm run build:api
npm run build:web
npm run check:architecture
npm run check:apps-script
```

`deploy:prepare` builds and validates, then prints `clasp status`. It does not deploy.

## 4. Apps Script Build and Deployment

Maintained Apps Script source lives under `apps/sheets/src`. The generated Apps Script runtime is:

```text
apps/sheets/build/Cockpit.js
apps/sheets/appsscript.json
```

The root `.clasp.json` uses `apps/sheets` as `rootDir`. `.claspignore` excludes source, tests,
tooling, docs, and package metadata while retaining generated runtime files and the manifest.

Prepare a reviewed deployment:

```sh
npm run deploy:prepare
clasp status
```

Deploy only after manual review:

```sh
clasp push
```

Do not run `clasp pull` unless a separate recovery task explicitly requires it.

## 5. Workbook Initialization

From the Google Sheet:

```text
Trading Cockpit -> Setup -> Initialize Trading Cockpit
```

Initialization creates missing canonical sheets, initializes empty required sheets, seeds required
reference/config rows where appropriate, and preserves canonical non-empty data. It must not invent
fake trading accounts or user-specific business data.

After initialization, add real account configuration as needed for trading workflows.

## 6. Workbook Validation

From the Google Sheet:

```text
Trading Cockpit -> Setup -> Validate Trading Cockpit
```

Validation is read-only. It checks required sheets, canonical headers, required config rows, and
known config conventions. A structurally valid workbook may still report manual configuration needs
for user-owned data such as real accounts or provider credentials.

Non-empty sheets with incompatible headers are schema mismatches and should be fixed deliberately,
not silently interpreted through fallback layouts.

## 7. Finviz Configuration

Finviz is the current external screener provider. It is not a domain concept.

For the Apps Script / Sheets runtime, configure the Finviz token through the supported Sheets menu.
For the Cloud Run API runtime, configure the token through the current Google Cloud secret/runtime
configuration. Do not commit tokens or secret values.

Signals History archives the complete configured Finviz CSV snapshot. Momentum Ranking is refreshed
from Signals History and uses only the fields required by the Momentum strategy.

## 8. Cloud Run Build and Deployment

The Cloud Run application is `apps/api`. The container build file is:

```text
apps/api/Dockerfile
```

It builds `apps/web`, builds `apps/api`, and serves the production React static assets from the API
runtime.

Required runtime configuration includes:

```text
TRADING_COCKPIT_SPREADSHEET_ID=<spreadsheet-id>
TRADING_COCKPIT_ALLOWED_EMAILS=<comma-separated allowed emails>
TRADING_COCKPIT_GOOGLE_CLIENT_ID=<oauth-client-id>
TRADING_COCKPIT_FINVIZ_TOKEN_SECRET=<secret-resource-name>
```

Build-time React configuration includes:

```text
VITE_TRADING_COCKPIT_GOOGLE_CLIENT_ID=<oauth-client-id>
```

Use placeholders in commands and scripts. Never hard-code project-specific secrets into the
repository.

## 9. Authorized Users

The browser signs in with Google identity. The API verifies the ID token and authorizes the user
against the configured allowlist. Cloud Run platform access and application authorization are
separate concerns: `/api/*` must remain protected by application middleware even when the service is
reachable by the browser.

## 10. Smoke Test

A concise end-to-end smoke test after deployment:

1. Open the React application and sign in with an authorized Google account.
2. Call `/health` or confirm the app shell loads.
3. In the Google Sheet, run `Validate Trading Cockpit` and require `VALID`.
4. Configure Finviz if needed.
5. In React Discovery, run `Refresh Signals`.
6. Confirm Signals History receives rows with complete canonical headers.
7. Run `Refresh Ranking`.
8. Add one candidate to Watchlist.
9. Create a Trade Plan from Watchlist.
10. Complete planning inputs until the backend marks it execution-eligible.
11. Execute the Trade Plan into a Position.
12. Manage/close the Position with explicit exit data.
13. Confirm a Journal entry exists.
14. Confirm Analytics and Dashboard load current backend-calculated data.
15. If account equity is used, confirm Accounts and Capital Ledger contain the required account
    setup and initial funding.

## 11. Logging and Troubleshooting

Cloud Run request logs and application stdout/stderr are visible in Google Cloud Logs Explorer. Use
request path, status, and the application error message to identify the failing route.

Useful local checks:

```sh
npm run check
npm run build:api
npm run build:web
npm run deploy:prepare
git diff --check
```

For Google Sheets API permission issues, verify the runtime identity has access to the spreadsheet
and the required Sheets scopes. For Finviz failures, verify the configured secret exists and does
not expose token values in logs.

## 12. Backup / Recovery

Before schema migrations or workbook rebuilds, create a manual copy/export of the Google Sheet.

Workbook initialization can recreate canonical empty sheets and default reference/config rows. It
cannot recreate user trading history, real accounts, capital ledger entries, provider secrets, or
manual annotations from deleted data.
