# React web cockpit

## Boundary

React is an inbound adapter. Components depend on `CockpitGateway`; only
gateway implementations may talk to a transport. The production HTTP gateway calls `apps/api`; the
Apps Script gateway remains available for the supported Sheets/Web App boundary. React knows neither
sheet names nor columns.

```text
Browser
  -> React Cockpit
  -> CockpitGateway
  -> HttpCockpitGateway
  -> apps/api route
  -> application use case
  -> Google Sheets API adapter
  -> source spreadsheet
```

## Shared contracts

Serializable DTOs are maintained in `packages/contracts`. React renders returned values; backend
queries and mutations remain authoritative for calculations, workflow transitions, and persistence.

## Local development

Run `npm run dev`. Vite selects `MockCockpitGateway` and shows a development-data banner. The mock is
small and explicit; it does not simulate Sheets or Apps Script. Production selects
`HttpCockpitGateway` and uses same-origin `/api/*` routes.

## Production build

`npm run build:web` uses Vite to produce static assets under `apps/web/dist`. `apps/api` serves those
assets and exposes the HTTP API routes used by `HttpCockpitGateway`.

Use this deployment workflow:

```sh
npm run check
npm run build:api
```

`clasp push` remains a separately authorized manual action for the Google Sheets UI only.

## Future features

Google Sheets remains a supported interface. Future Web UI slices should reuse the gateway boundary
and backend use cases. Administration belongs under `apps/web/src/features/admin/`; it will not be a
separate SPA.
