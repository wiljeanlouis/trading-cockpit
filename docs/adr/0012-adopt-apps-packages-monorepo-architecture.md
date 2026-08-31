# ADR 0012: Adopt apps/packages monorepo architecture

- Status: Accepted
- Date: 2026-08-31
- Supersedes: ADR 0010

## Context

Trading Cockpit now has multiple runtime applications and shared TypeScript packages. The earlier
single-application layout no longer expresses the real boundaries between React, Cloud Run, Apps
Script, shared application/domain logic, and serializable contracts.

## Decision

Use an `apps/` and `packages/` monorepo structure:

```text
apps/api
apps/sheets
apps/web
packages/core
packages/contracts
```

`apps/api` is the Node HTTP API and Cloud Run runtime. `apps/sheets` is the Google Apps Script /
Google Sheets integration. `apps/web` is the React frontend. `packages/core` contains
runtime-neutral domain/application behavior and ports. `packages/contracts` contains serializable
contracts and shared schema definitions.

Dependency direction is inward:

```text
apps/web -> packages/contracts
apps/api -> packages/core -> packages/contracts
apps/sheets -> packages/core -> packages/contracts
packages/contracts -> no application dependency
```

Historical names such as `backend/`, `cloud-run/`, and `packages/backend-core/` are not current
repository structure.

## Consequences

Runtime concerns are separated by application. Shared business behavior can be reused by Cloud Run
and Apps Script without duplication. Build and deployment tooling must target the correct app
workspace.
