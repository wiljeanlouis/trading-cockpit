# Trading Cockpit

Trading Cockpit is a Google Sheets trading cockpit backed by Google Apps Script. The repository is
prepared to host more than one user interface while keeping one authoritative backend.

## Repository structure

```text
trading-cockpit/
├── backend/       # Current Google Apps Script application, TypeScript source and tests
├── docs/          # Architecture documentation and ADRs
├── package.json   # Repository-level npm orchestration
└── README.md
```

`backend/` is the complete supported application today. It includes the Google Sheets UI adapters,
business/application code, Google Sheets persistence, Finviz integration, maintained legacy
JavaScript, Apps Script manifest, tests and build tooling.

Run the complete local validation from the repository root:

```sh
npm install
npm run check
npm run deploy:prepare
```

`deploy:prepare` builds and validates the runtime and prints `clasp status`; it does not deploy.
`clasp push` remains a separate manual operation.

## Future web application

A later phase may add `web/` as a React + TypeScript inbound interface. It will call backend
application capabilities and will not access Google Sheets directly. Administration will be a
feature under `web/src/features/admin/`, not a separate application.

The anticipated frontend feature areas are dashboard, watchlist, trade plans, positions, journal,
analytics and admin. No React application, frontend gateway or shared-contract package is created in
Phase 11.8.

The provisional, non-implemented frontend direction is:

```text
web/src/
├── app/
├── features/
│   ├── dashboard/
│   ├── watchlist/
│   ├── trade-plans/
│   ├── positions/
│   ├── journal/
│   ├── analytics/
│   └── admin/
│       ├── strategies/
│       ├── accounts/
│       ├── risk/
│       ├── data-sources/
│       └── system/
├── components/
└── infrastructure/
```

See [development workflow](docs/development.md) and
[architecture overview](docs/architecture/overview.md).
