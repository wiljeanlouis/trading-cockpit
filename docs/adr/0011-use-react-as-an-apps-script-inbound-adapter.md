# ADR 0011: Use React as an Apps Script inbound adapter

- Status: Accepted
- Date: 2026-08-28

## Context

Trading Cockpit now needs a browser interface alongside its supported Google Sheets UI. Apps Script
HtmlService cannot serve a normal Vite asset directory, and frontend code must not become another
owner of Google Sheets schemas or business rules.

## Decision

Use React and Vite in the `web` npm workspace. Components depend on a typed `CockpitGateway`.
Production uses an Apps Script implementation that wraps `google.script.run`; local Vite development
uses an explicit mock implementation. Serializable DTOs shared across runtimes live in the small
`packages/contracts` workspace.

Serve the production application through an Apps Script `doGet` entrypoint. Build JavaScript and CSS
into one generated `backend/build/CockpitWeb.html` file for HtmlService. Backend entrypoints stay
thin and delegate to application use cases and outbound repositories.

## Consequences

- React has no dependency on SpreadsheetApp, sheet names, ranges, or backend implementations.
- Google Sheets and React remain supported inbound adapters over the same backend.
- Frontend development works without remote deployment.
- The clasp runtime adds one generated HTML file plus the `doGet` and Dashboard data callbacks.
- The bound Sheet must register its stable ID before Web App calls can read it.
- Future administration belongs in the same React application, not a separate SPA.
