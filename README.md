# Trading Cockpit

Trading Cockpit is a Google Sheets trading cockpit backed by Google Apps Script. The repository is
organized as a small monorepo with one shared runtime-neutral core and multiple application
surfaces.

## Repository structure

```text
trading-cockpit/
├── apps/sheets/       # Current Google Apps Script application, TypeScript source and tests
├── apps/api/          # Node HTTP API application for Cloud Run
├── apps/web/           # React + TypeScript inbound UI
├── packages/
│   ├── core/           # Runtime-neutral domain/application logic and ports
│   └── contracts/      # Serializable contracts shared by apps
├── docs/          # Architecture documentation and ADRs
├── package.json   # Repository-level npm orchestration
└── README.md
```

`apps/sheets/` is the supported Google Sheets / Apps Script application. `apps/api/` is the Node HTTP
API currently deployable to Google Cloud Run. Both reuse `packages/core` instead of duplicating
business/application logic.

Run the complete local validation from the repository root:

```sh
npm install
npm run check
npm run deploy:prepare
```

`deploy:prepare` builds and validates the runtime and prints `clasp status`; it does not deploy.
`clasp push` remains a separate manual operation.

## Web cockpit

`apps/web/` is a React + TypeScript inbound interface. It calls backend capabilities through a typed
`CockpitGateway`; it never accesses Google Sheets directly. Local development uses explicit mock
data, while production may use the HTTP API or Apps Script gateway depending on deployment mode.

Start local frontend development with:

```sh
npm run dev
```

The currently implemented frontend shape is:

```text
apps/web/src/
├── app/
├── features/
│   ├── dashboard/
│   ├── discovery/
│   ├── watchlist/
│   ├── trade-plans/
│   ├── positions/
│   ├── journal/
│   ├── analytics/
│   └── admin/
└── infrastructure/
    ├── apps-script/
    └── http/
```

See [development workflow](docs/development.md) and [web cockpit](docs/web-cockpit.md).
