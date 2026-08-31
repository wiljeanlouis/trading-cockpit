# AGENTS.md

# Trading Cockpit — Agent Instructions

## 1. Purpose

Trading Cockpit is a personal trading workflow and research application.

The core workflow is:

```text
Signal → Watchlist → Trade Plan → Position → Journal → Analytics
```

The system must remain generic enough to support multiple trading strategies over time.

Momentum Breakout is one strategy, not the architecture of the application.

Do not introduce assumptions that make Trading Cockpit dependent on one specific strategy unless explicitly required by that strategy.

---

## 2. Current Repository Structure

The current repository structure is:

```text
trading-cockpit/
├── apps/
│   ├── api/
│   ├── sheets/
│   └── web/
├── packages/
│   ├── contracts/
│   └── core/
├── docs/
├── AGENTS.md
├── package.json
├── package-lock.json
├── eslint.config.mjs
├── .clasp.json
├── .claspignore
└── .dockerignore
```

Do not restore historical paths such as:

```text
backend/
web/
cloud-run/
packages/backend-core/
```

Always inspect the real repository before assuming that any deeper internal directory layout is unchanged.

The repository code and tests are the technical source of truth.

---

## 3. Workspace Responsibilities

### apps/web

React + TypeScript Web Cockpit.

This is the primary user-facing application.

Responsibilities include:

- rendering;
- navigation;
- forms and interaction;
- presentation state;
- calling application capabilities through the typed `CockpitGateway`.

React must not own authoritative trading or financial business rules.

### apps/api

Node HTTP API application.

This is the production HTTP backend and is currently deployed using Google Cloud Run.

Responsibilities include:

- `/api/*` HTTP routes;
- authentication and authorization;
- request validation;
- invoking application/core behavior;
- Google Sheets API adapters;
- external-provider adapters;
- Secret Manager integration;
- serving the production React static build;
- `/health`.

Cloud Run is a deployment runtime, not an architectural layer.

Do not introduce Cloud-Run-specific concepts into the domain/core unless genuinely required.

### apps/sheets

Google Apps Script application associated with the Trading Cockpit Spreadsheet.

Responsibilities include:

- the Trading Cockpit Sheets menu;
- workbook initialization/setup;
- workbook validation;
- supported Google Sheets workflows;
- Apps Script-specific adapters;
- spreadsheet formatting/projections where intentionally supported.

`apps/sheets` is not the production HTTP backend for React.

React must not depend on Apps Script to function in production.

### packages/core

Runtime-neutral shared backend core.

It contains reusable domain/application behavior and ports that can be used by `apps/api` and `apps/sheets`.

It must remain independent of:

- React;
- Google Apps Script runtime globals;
- Cloud Run;
- Express/HTTP-specific concerns;
- concrete Google Sheets infrastructure.

Do not move runtime-specific infrastructure into `packages/core`.

### packages/contracts

Runtime-neutral serializable contracts shared across boundaries.

It must not depend on any application workspace.

Contracts should contain plain serializable application data, not runtime objects.

---

## 4. Current Dependency Graph

Preserve this workspace dependency direction:

```text
apps/web
  └── @trading-cockpit/contracts

apps/api
  ├── @trading-cockpit/core
  ├── @trading-cockpit/contracts
  ├── googleapis
  └── google-auth-library

apps/sheets
  ├── @trading-cockpit/core
  └── @trading-cockpit/contracts

packages/core
  └── @trading-cockpit/contracts

packages/contracts
  └── no application dependency
```

Current package names are:

```text
@trading-cockpit/web
@trading-cockpit/api
@trading-cockpit/sheets
@trading-cockpit/core
@trading-cockpit/contracts
```

Do not reintroduce historical package names:

```text
@trading-cockpit/backend-core
@trading-cockpit/cloud-run
```

Infrastructure depends inward.

Never introduce dependencies such as:

```text
core → api
core → sheets
core → web

contracts → core
contracts → any app

web → sheets
web → API implementation modules
```

---

## 5. Architectural Direction

Trading Cockpit follows a pragmatic ports-and-adapters / Clean Architecture direction.

Conceptually:

```text
Inbound adapter
      ↓
Application/use case
      ↓
Domain
      ↑
Ports
      ↑
Outbound adapters
```

Keep business behavior independent from infrastructure.

Do not bypass established application use cases merely because directly calling a persistence adapter is easier.

Do not create architecture ceremony solely for purity.

Prefer the smallest useful abstraction that preserves the dependency direction.

---

## 6. Business Logic Ownership

Authoritative business behavior belongs in the backend/core side of the architecture, not React.

Examples include:

- workflow transitions;
- strategy rules;
- Momentum Score;
- ranking;
- position sizing;
- risk calculations;
- capital calculations;
- stop calculations;
- trade-plan rules;
- position lifecycle;
- journal rules;
- analytics calculations;
- reconciliation;
- persistence semantics;
- provider integration semantics.

React may perform presentation-only calculations.

Do not duplicate authoritative financial or trading rules in React.

---

## 7. React Backend Boundary

React communicates through the typed `CockpitGateway`.

Current production direction:

```text
React feature
    ↓
CockpitGateway
    ↓
HttpCockpitGateway
    ↓
same-origin /api/*
    ↓
apps/api
    ↓
core/use cases
```

Development may use `MockCockpitGateway`.

`AppsScriptCockpitGateway` may remain only where intentionally retained for historical/rollback purposes. Do not treat it as the normal production transport.

React components must never directly use:

```text
google.script.run
SpreadsheetApp
Google Sheets API clients
Google Sheets repositories
Apps Script runtime globals
```

The gateway exposes application capabilities, not spreadsheet primitives.

Good:

```typescript
getWatchlist();
createTradePlan(command);
closePosition(command);
```

Bad:

```typescript
getSheetRows('Watchlist');
updateCell('Trade Plans', 12, 7, 'READY');
```

---

## 8. HTTP API

`apps/api` owns the production HTTP boundary.

React should use same-origin relative routes:

```text
/api/*
```

Do not hard-code the Cloud Run service URL into application logic.

Preserve typed request/response contracts.

Do not change HTTP contracts casually.

When changing a boundary, inspect all affected areas:

- `packages/contracts`;
- `packages/core`;
- `apps/api`;
- `apps/web`;
- `apps/sheets` when applicable;
- relevant tests.

---

## 9. Authentication

Production Web Cockpit authentication uses Google Identity Services.

React obtains a Google ID token and sends:

```text
Authorization: Bearer <token>
```

`apps/api` verifies the token and authorization policy.

Preserve verification of the configured security properties, including:

- signature;
- issuer;
- audience;
- `email_verified`;
- authorized-email allowlist.

Do not confuse application GIS authentication with Cloud Run IAM authentication.

The Cloud Run service may be platform-accessible while `/api/*` remains protected by application middleware.

Never log credentials, ID tokens, OAuth secrets, or other secrets.

---

## 10. Google Sheets Role

Google Sheets remains the persistence/source-of-truth layer.

Both `apps/api` and `apps/sheets` may interact with the same workbook through their own adapters.

React never accesses Google Sheets directly.

The workbook is an application data contract, not an informal spreadsheet whose physical layout can be guessed.

Do not introduce a database unless explicitly requested.

---

## 11. Canonical Workbook Data Contract

The project intentionally supports one current canonical workbook schema.

For DATA sheets:

```text
row 1 = canonical headers
row 2+ = records
```

DATA sheets must not contain structural presentation before the table, including:

- title rows;
- metadata rows;
- blank spacer rows;
- merged title cells;
- decorative structures that move the header away from row 1.

DATA sheets may use non-structural usability formatting:

- frozen row 1;
- filters;
- column widths;
- number/date/currency/percent formats;
- validations;
- checkboxes;
- useful conditional formatting;
- restrained header styling.

CONFIG sheets should also be deterministic. Prefer row-1 headers and row-2+ records when the configuration is naturally tabular.

An explicit CONFIG exception is acceptable only when the current design genuinely requires a different structure.

---

## 12. No Legacy Workbook Fallback

Historical workbook data has been backed up and the current workbook may be rebuilt using the canonical schema.

Do not preserve or introduce fallback chains solely to support obsolete layouts.

Do not implement behavior such as:

```text
try headers on row 1
else row 3
else row 5
else guess historical schema
```

Expected behavior:

```text
canonical existing sheet
→ use it

missing sheet during explicit setup
→ create canonical sheet

empty existing sheet during explicit setup
→ initialize canonical sheet

non-empty incompatible sheet
→ fail safely with a clear schema error
```

Do not silently destroy unknown content.

Do not automatically migrate historical schemas unless explicitly requested.

---

## 13. Reproducible Workbook Setup

Trading Cockpit should be installable/reconstructable from code while preserving the Spreadsheet ID.

The intended Apps Script menu is:

```text
Trading Cockpit
  → Setup
    → Initialize Trading Cockpit
    → Validate Trading Cockpit
```

The initialization flow should create all CURRENT required workbook structures from an empty/clean Spreadsheet.

No manual creation of required:

- sheets;
- headers;
- config rows;
- validations;
- structural formatting

should be necessary.

Initialization must be idempotent.

Repeated initialization must not:

- duplicate sheets;
- duplicate headers;
- duplicate seeded configuration;
- erase valid business records;
- reset valid user configuration unnecessarily;
- accumulate filters or formatting artifacts.

The canonical workbook inventory must be derived from current runtime requirements, not from the historical list of tabs.

---

## 14. Workbook Validation

Workbook validation must be read-only.

It must not:

- create sheets;
- repair sheets;
- migrate layouts;
- rewrite headers;
- seed configuration;
- change formatting.

It should report `VALID` only when the workbook satisfies the current structural requirements of the applications.

Schema problems should be explicit.

Example:

```text
INVALID

Trade Plans:
  Missing header: Account ID

Momentum Ranking:
  Expected canonical headers on row 1
```

Prefer validation errors over obscure downstream HTTP 500 errors.

---

## 15. Sheet Classification

When working on setup or persistence, classify workbook tabs according to current code:

```text
DATA
CONFIG
TECHNICAL
OPTIONAL_REPORT
LEGACY_UNUSED
```

Do not assume the old 16-sheet workbook is still the canonical target.

In particular, determine current runtime need before recreating historical sheets such as:

- Dashboard;
- Analytics;
- Documentation;
- Finviz - Momentum;
- Lists.

React is now the primary UI.

A Sheets report should exist only when it still provides an intentional supported capability.

---

## 16. Sheets Concurrency and Mutation Safety

Google Sheets is not a transactional database.

Multi-sheet mutations are not atomic and may partially succeed.

`apps/api` and `apps/sheets` may access the same workbook concurrently.

Consider race conditions when changing mutations.

Do not introduce automatic mutation retries unless the operation is demonstrably idempotent.

Where stable idempotency is required, prefer a durable operation/business identifier.

Cloud Run instance or concurrency limits are risk-reduction settings, not transaction guarantees.

---

## 17. Sheets Performance

Avoid unnecessary Google Sheets API/Apps Script round trips.

For `apps/api`:

- preserve request-scoped table/data reuse where useful;
- preserve efficient batch reads where appropriate;
- keep Google API client memoization where useful;
- do not introduce persistent business-data caching without an explicit design decision;
- requests should observe appropriately fresh workbook state.

Do not sacrifice correctness merely to reduce calls.

---

## 18. Contracts

`packages/contracts` contains serializable application contracts.

Prefer:

- string;
- number;
- boolean;
- null;
- arrays;
- plain objects.

Do not expose runtime/infrastructure objects such as:

```text
Spreadsheet
Sheet
Range
Properties
Request
Response
```

Normalize dates and times explicitly across application boundaries.

Contracts describe application concepts, not physical spreadsheet operations.

---

## 19. Multi-Strategy Design

Trading Cockpit must remain capable of supporting multiple strategies.

Do not encode:

```text
Trading Cockpit = Momentum Breakout
```

Different strategies may have different:

- signals;
- scores;
- filters;
- rankings;
- entry criteria;
- exit criteria;
- metadata;
- provider requirements.

Use strategy-aware abstractions when current requirements justify them.

Avoid speculative strategy frameworks.

---

## 20. Workflow and Financial Correctness

Preserve workflow integrity:

```text
Signal → Watchlist → Trade Plan → Position → Journal → Analytics
```

Do not bypass workflow transitions with direct persistence mutations unless implementing an explicit maintenance/reconciliation capability.

Financial correctness has priority over displaying more metrics.

Never invent financial values.

Treat carefully:

- available capital;
- deployed capital;
- open risk;
- realized P&L;
- unrealized P&L;
- account aggregation;
- FX conversion;
- position sizing;
- portfolio exposure;
- stops;
- return calculations.

If semantics are uncertain, establish them before exposing or changing a metric.

Prefer omitting an uncertain metric over presenting a misleading one.

---

## 21. React UI

Preserve the established Trading Cockpit identity:

- dark navy/dark trading interface;
- green/mint accent;
- professional desktop-oriented layout;
- compact financial information;
- clear information hierarchy;
- readable cards and tables.

Prefer feature-oriented organization.

Do not create empty speculative features.

Apply YAGNI.

UI libraries such as shadcn/ui should provide useful primitives, not replace the product's visual identity.

Do not add large sets of unused components.

---

## 22. Local Web Development

Local React development must not require `clasp push`.

Development may use `MockCockpitGateway`.

Production uses `HttpCockpitGateway`.

Mock data and mock transport selection must remain clearly development-only.

Do not allow mock behavior to leak into production builds.

---

## 23. Apps Script Build and Deployment Boundary

clasp is configured for the `apps/sheets` application.

The deployment surface should contain only Apps Script runtime artifacts.

The current expected deployable artifacts include the Apps Script manifest and generated bundle, such as:

```text
apps/sheets/appsscript.json
apps/sheets/build/Cockpit.js
```

Always verify the actual build and clasp configuration before assuming exact files.

Development source files under `apps/sheets` may exist locally without being part of `filesToPush`.

Do not manually edit generated bundles when source files exist.

Preserve globally visible Apps Script entrypoints and menu handlers.

Do not rename them casually.

---

## 24. API Build Boundary

The production `apps/api` artifact must run as JavaScript without runtime dependency on repository TypeScript source files.

Internal workspace code such as `@trading-cockpit/core` must be bundled/packaged so production does not attempt to load:

```text
packages/core/src/*.ts
```

Do not restore broad externalization behavior that externalizes internal workspace packages.

External dependencies such as Google libraries may remain external when intentionally packaged in the runtime image.

Preserve the plain-Node `/health` smoke capability.

---

## 25. Docker and Runtime

The Docker build must use the current monorepo structure:

```text
apps/api
apps/web
packages/core
packages/contracts
```

The Dockerfile currently belongs to the API application and must be discovered at its actual current path before editing.

Preserve required React/Vite build-time configuration, including the configured Google OAuth client ID build argument.

Remember:

```text
VITE_* values are browser-visible
```

Never place secrets in Vite variables.

Use `.dockerignore` to keep the Docker build context appropriately small.

A Node version warning from a dependency must not be “fixed” opportunistically during unrelated work; handle runtime upgrades as a deliberate change.

---

## 26. Secrets and External Providers

Never hard-code:

- Finviz tokens;
- OAuth secrets;
- Google credentials;
- service-account credentials;
- authentication tokens.

Use the project's established secret/configuration mechanisms.

Production Finviz credentials use the established Google Secret Manager integration.

Do not expose secret values to React.

Do not log secrets.

External-provider details should remain behind appropriate ports/adapters.

---

## 27. Dependencies

Before adding a dependency, determine whether it provides enough current value to justify:

- maintenance;
- bundle size;
- runtime compatibility;
- Apps Script compatibility where relevant;
- Docker/build complexity.

Do not introduce Nx, Turborepo, another monorepo framework, another backend framework, or another state-management framework without a demonstrated requirement.

Use the existing stack unless the requested task requires otherwise.

---

## 28. Scope and Refactoring Discipline

Implement the requested task only.

Do not automatically implement future phases.

Avoid broad unrelated refactors while implementing a feature.

Before changing existing behavior:

1. inspect the current implementation;
2. inspect relevant tests;
3. understand the current reason/contract;
4. make the smallest coherent change.

Preserve existing behavior unless the task explicitly changes it.

---

## 29. Testing During Development

The user performs final repository validation manually unless explicitly delegated.

During implementation:

- run targeted tests needed for the changed behavior;
- run targeted typecheck/lint/build checks when useful;
- iterate using focused validation;
- do not repeatedly run the entire repository suite without reason.

Do not weaken or remove tests merely to make a change pass.

If a prompt explicitly asks for broader validation, follow that prompt.

---

## 30. Final Validation

Do not assume final global validation is delegated to the agent.

At completion, inspect the actual root `package.json` and report the appropriate commands for the user to run.

Current common validation commands include:

```bash
npm run check
npm run deploy:prepare
git diff --check
git status
clasp status
```

Use actual repository scripts. Do not invent commands.

---

## 31. Deployment Safety

Never execute any deployment action unless explicitly authorized.

This includes:

```bash
clasp push
clasp pull
gcloud run deploy
gcloud builds submit
```

or equivalent deployment commands.

Before an authorized Apps Script deployment:

1. build;
2. validate;
3. inspect the clasp deployment surface;
4. confirm only expected runtime files will be pushed.

Before an authorized API/Cloud Run deployment:

1. build the production artifact/image;
2. verify the API artifact;
3. smoke-test `/health` when appropriate;
4. verify configuration;
5. deploy only after explicit authorization.

Implementation completion never implies deployment authorization.

---

## 32. Git Safety

Never commit or push unless explicitly requested.

Never discard user changes.

Do not silently run destructive Git operations such as:

```text
reset
checkout
restore
stash
clean
```

against user work.

Preserve unrelated uncommitted changes.

Large structural moves may appear as delete/add before staging; do not assume files were lost merely from unstaged rename detection.

---

## 33. Documentation

Do not update documentation during every implementation task unless:

- explicitly requested;
- documentation is part of acceptance criteria;
- active documentation would otherwise become materially dangerous or incorrect.

Prefer dedicated documentation phases for broad documentation refreshes.

Historical ADRs may intentionally retain old names and paths because they describe decisions at that time.

Do not rewrite historical ADRs solely to make historical terminology match the current repository.

Current operational documentation must use current names.

---

## 34. Agent Reporting

Keep normal completion reports concise.

Report:

1. what changed;
2. important architectural decisions;
3. targeted tests/checks actually executed;
4. limitations or manual steps;
5. final validation commands for the user.

Do not repeat the entire prompt.

Do not claim commands/tests were executed when they were not.

Do not generate extensive phase documentation unless requested.

---

## 35. Source of Truth Priority

When information conflicts, use this priority:

1. explicit current user instruction;
2. current repository code and tests;
3. this `AGENTS.md`;
4. current operational documentation;
5. historical ADRs and assumptions.

Inspect current code before relying on historical project knowledge.

---

## 36. Definition of Done

Unless the task provides stricter acceptance criteria, implementation is complete when:

- requested behavior is implemented;
- architectural boundaries are preserved;
- relevant targeted tests executed by the agent pass;
- unrelated behavior was not intentionally changed;
- no unauthorized deployment occurred;
- no unauthorized commit/push occurred;
- remaining limitations/manual steps are stated;
- final validation commands are provided for the user.

Do not automatically begin another phase.

---

## 37. Guiding Principle

Prefer:

```text
explicit
deterministic
testable
reproducible
runtime-neutral core
strict boundaries
one canonical workbook schema
simple architecture where possible
```

over:

```text
historical assumptions
implicit spreadsheet layouts
legacy fallback chains
duplicated business logic
manual workbook setup knowledge
technology-specific core code
speculative abstractions
```

When uncertain, inspect the current repository and choose the simplest design that correctly satisfies the current requirement.
