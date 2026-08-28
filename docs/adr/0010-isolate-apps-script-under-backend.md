# ADR 0010: Isolate the Apps Script application under backend

- Status: Accepted
- Date: 2026-08-28

## Context

The repository currently contains one deployable application: the Google Apps Script backend and
Google Sheets UI. A future React UI must coexist with that application without becoming coupled to
Google Sheets persistence or provider adapters.

## Decision

Relocate the complete current application under `backend/`: maintained JavaScript, manifest,
TypeScript source, tests, build scripts and backend-specific TypeScript/Vitest configuration. Keep
npm dependencies and command orchestration at the repository root while there is only one package.
Point clasp `rootDir` to `backend` and preserve the existing deployable file set through
`.claspignore`.

Do not create npm workspaces, `web/`, or `packages/contracts/` until a real second package or shared
contract exists. The future React application is another inbound UI and must call backend
application capabilities instead of accessing Google Sheets directly. Administration belongs inside
that web application as a feature.

## Consequences

- Apps Script deployment discovery is physically confined to `backend/`.
- Existing Google Sheets callbacks, menu names and runtime files remain unchanged inside Apps Script.
- Root npm commands continue to provide one installation and one validation entrypoint.
- Adding the future web package may justify npm workspaces and a shared TypeScript base later.
- Local clasp status proves the selected file set, but only a separately authorized deployment can
  prove the remote Apps Script project after relocation.
