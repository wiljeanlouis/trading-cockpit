# Trading Cockpit

Trading Cockpit is a personal trading workflow and research application. React is the primary
operational UI, the Node.js API runs on Cloud Run, and Google Sheets remains the current
source-of-truth datastore plus a supported Sheets interface.

The core workflow is:

```text
Finviz discovery -> Signals History -> Momentum Ranking -> Watchlist
-> Trade Plan -> Position -> Journal -> Analytics / Dashboard
```

## Repository structure

```text
trading-cockpit/
├── apps/
│   ├── api/       # Node.js HTTP API and production web hosting for Cloud Run
│   ├── sheets/    # Google Apps Script / Google Sheets integration
│   └── web/       # React + TypeScript frontend
├── packages/
│   ├── core/      # Runtime-neutral domain/application logic and ports
│   └── contracts/ # Serializable contracts shared by apps
├── docs/
│   ├── architecture.md
│   ├── operations.md
│   └── adr/
├── AGENTS.md
└── package.json
```

## Getting started

```sh
npm install
npm run check
```

For day-to-day development and deployment procedures, use the operational runbook rather than this
README.

## Documentation

- [Coding-agent instructions](AGENTS.md)
- [Current architecture](docs/architecture.md)
- [Operations runbook](docs/operations.md)
- [Architecture Decision Records](docs/adr/README.md)
