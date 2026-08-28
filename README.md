# Trading Cockpit

Trading Cockpit is a Google Sheets trading cockpit backed by Google Apps Script. The repository is
prepared to host more than one user interface while keeping one authoritative backend.

## Repository structure

```text
trading-cockpit/
├── backend/       # Current Google Apps Script application, TypeScript source and tests
├── web/           # React + TypeScript inbound UI
├── packages/
│   └── contracts/ # Serializable contracts shared by backend and web
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

## Web cockpit

`web/` is a React + TypeScript inbound interface. Its read-only Dashboard calls the backend through
a typed `CockpitGateway`; it never accesses Google Sheets or Apps Script globals directly. Vite dev
uses explicit mock data, while the production build uses `google.script.run` behind the gateway.

Start local frontend development with:

```sh
npm run dev
```

The currently implemented frontend shape is:

```text
web/src/
├── app/
├── features/
│   └── dashboard/
└── infrastructure/
    └── apps-script/
```

Administration will eventually live under `web/src/features/admin/`, not in a separate SPA.

See [development workflow](docs/development.md) and [web cockpit](docs/web-cockpit.md).
