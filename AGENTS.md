# AGENTS.md

# Trading Cockpit — Agent Instructions

## 1. Purpose

Trading Cockpit is a personal trading workflow and research application.

The system currently combines:

- Google Apps Script as the runtime/backend platform;
- Google Sheets as the persistence layer and an officially supported user interface;
- React + TypeScript as the Web Cockpit;
- Finviz as an external signal/data source;
- quantitative and workflow logic implemented in the backend.

The application supports trading workflows such as:

Signal → Watchlist → Trade Plan → Position → Journal → Analytics

The architecture must remain generic enough to support multiple trading strategies over time.

Do not assume that Momentum Breakout is the only strategy the system will ever support.

---

## 2. Repository Structure

The repository is organized approximately as follows:

```text
trading-cockpit/
├── AGENTS.md
├── backend/
│   ├── src/
│   ├── tests/
│   ├── scripts/
│   ├── build/
│   ├── *.js
│   ├── appsscript.json
│   ├── tsconfig*.json
│   └── vitest.config.ts
├── web/
│   ├── src/
│   ├── tests/
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── packages/
│   └── contracts/
├── docs/
├── package.json
├── package-lock.json
├── eslint.config.mjs
├── .clasp.json
└── .claspignore
```

Always inspect the real repository before assuming that this structure is completely up to date.

The repository itself is the source of truth.

---

## 3. Architectural Principles

Trading Cockpit follows a ports-and-adapters / clean architecture direction.

The main dependency direction is:

```text
Inbound adapters
      ↓
Application
      ↓
Domain
      ↑
Ports
      ↑
Outbound adapters
```

Infrastructure must depend on the application/domain, not the opposite.

Do not move infrastructure concerns into the domain.

Do not bypass established application use cases simply because directly accessing an adapter would be easier.

---

## 4. Backend Ownership

The backend owns business behavior.

Business rules must not be duplicated in React.

Examples include:

- trading workflow transitions;
- Momentum Score;
- strategy logic;
- position sizing;
- risk calculations;
- capital calculations;
- stop calculations;
- trade plan rules;
- journal rules;
- analytics calculations;
- data reconciliation;
- external provider integration;
- persistence semantics.

When new behavior is required, first determine whether it belongs in:

- domain;
- application;
- inbound adapter;
- outbound adapter.

Do not place business logic in UI components.

---

## 5. React Web Cockpit

The React application is an inbound adapter.

The expected direction is:

```text
React
  ↓
CockpitGateway
  ↓
AppsScriptCockpitGateway
  ↓
google.script.run
  ↓
Apps Script entrypoint
  ↓
Application use case
```

React must NEVER directly access Google Sheets.

React must NEVER import or use:

```text
SpreadsheetApp
Sheet
Range
Google Sheets repositories
backend adapter implementations
```

React components must NEVER call:

```text
google.script.run
```

directly.

All Apps Script communication must go through the CockpitGateway abstraction.

---

## 6. CockpitGateway

The frontend/backend boundary must remain explicit and typed.

Conceptually:

```typescript
interface CockpitGateway {
  getDashboardSummary(): Promise<DashboardSummaryDto>;
}
```

Future operations should be added to this boundary deliberately.

Do not expose low-level Google Sheets operations through the gateway.

Bad:

```typescript
getSheetRows('Watchlist');
updateCell('Trade Plans', 12, 7, 'READY');
```

Good:

```typescript
getWatchlist();
createTradePlan(command);
closePosition(command);
```

The gateway represents application capabilities, not spreadsheet capabilities.

---

## 7. Shared Contracts

Serializable frontend/backend contracts may live under:

```text
packages/contracts/
```

Contracts must contain plain serializable data.

Prefer:

- string;
- number;
- boolean;
- null;
- arrays;
- plain objects.

Avoid passing Apps Script runtime objects.

Never expose objects such as:

```text
Spreadsheet
Sheet
Range
Properties
Date objects with ambiguous serialization
```

Normalize dates/times explicitly when crossing the boundary.

Contracts should represent application concepts rather than Google Sheets implementation details.

---

## 8. Google Sheets

Google Sheets currently serves two purposes:

1. persistence/data store;
2. officially supported UI.

Do not remove or intentionally break the existing Google Sheets UI unless explicitly requested.

The React Cockpit and Google Sheets UI must be able to coexist.

Conceptually:

```text
Google Sheets UI ──────┐
                       ↓
                    Backend
                       ↑
React Cockpit ─────────┘
```

Do not describe Google Sheets as deprecated or legacy unless the project explicitly makes that decision later.

---

## 9. Apps Script Runtime

Google Apps Script remains the runtime backend.

clasp uses:

```text
backend/
```

as its deployment root.

Only runtime artifacts required by Apps Script should be deployable.

Source TypeScript, React source code, tests, development scripts, Vite configuration and other development-only files must not be pushed to Apps Script.

Always preserve this boundary.

---

## 10. Generated Files

Files under build directories are generated artifacts unless the repository clearly indicates otherwise.

Do not manually edit generated artifacts when the source file can be modified instead.

Use the appropriate build command to regenerate them.

For example:

```text
backend/build/Cockpit.js
backend/build/CockpitWeb.html
```

should normally be produced by the build pipeline.

---

## 11. React Build and Apps Script

The React application is built using Vite.

The production Web Cockpit must remain compatible with Apps Script HtmlService.

The current strategy produces a self-contained HTML artifact suitable for Apps Script.

Do not assume that a normal multi-asset Vite `dist/` deployment can be served by Apps Script.

Preserve the existing single-file/inlined build strategy unless there is a demonstrated reason to change it.

Avoid unnecessary external runtime assets.

---

## 12. Local Frontend Development

Local React development must not require a `clasp push` after every UI change.

The frontend may use a mock CockpitGateway during local development.

Conceptually:

```text
Vite development
      ↓
MockCockpitGateway

Apps Script production
      ↓
AppsScriptCockpitGateway
```

Mock data must remain clearly identifiable as development data.

Do not allow mock behavior to leak into production builds.

---

## 13. Frontend Organization

Prefer feature-oriented organization.

Example:

```text
web/src/
├── app/
├── components/
│   └── ui/
├── features/
│   ├── dashboard/
│   ├── watchlist/
│   ├── trade-plans/
│   ├── positions/
│   ├── journal/
│   ├── analytics/
│   └── admin/
└── infrastructure/
    └── apps-script/
```

Only create features when they are actually needed.

Avoid empty speculative architecture.

Apply YAGNI.

---

## 14. Administration

Administration belongs inside the Web Cockpit.

The intended location is:

```text
web/src/features/admin/
```

Do not create a separate `admin/` application unless explicitly requested in the future.

Potential administrative areas may eventually include:

- strategies;
- accounts;
- risk;
- data sources;
- system health;
- configuration.

Do not implement these ahead of actual requirements.

---

## 15. Frontend Design

Preserve the established Trading Cockpit visual identity.

Current direction:

- dark navy / dark trading interface;
- green/mint accent;
- clear information hierarchy;
- professional desktop-oriented layout;
- compact financial/trading information;
- readable cards and tables.

Do not replace the existing visual identity with a generic component-library theme.

If shadcn/ui is introduced, use it as a collection of UI primitives, not as the visual identity of Trading Cockpit.

Only install components that are actually required.

Avoid adding dozens of unused UI components.

---

## 16. shadcn/ui and Tailwind

shadcn/ui may be introduced when it provides concrete value for interactive UI features such as:

- tables;
- dialogs;
- dropdown menus;
- forms;
- badges;
- selects;
- tooltips;
- tabs;
- sheets/drawers;
- notifications.

Before relying heavily on it, ensure that its generated CSS and dependencies remain compatible with the Apps Script single-file Vite build.

Preserve the existing Cockpit theme when adopting shadcn/ui.

Do not perform a wholesale visual rewrite merely to adopt shadcn/ui.

---

## 17. Trading Strategies

The system must remain capable of supporting multiple strategies.

Do not introduce assumptions such as:

```text
Trading Cockpit = Momentum Breakout
```

Momentum Breakout is one strategy.

Future strategies may have different:

- signals;
- scoring;
- filters;
- ranking;
- entry criteria;
- exit criteria;
- metadata.

Prefer strategy-aware abstractions where appropriate.

Avoid generic abstractions that provide no current value, however.

---

## 18. Workflow

The core trading workflow is conceptually:

```text
Signal
  ↓
Watchlist
  ↓
Trade Plan
  ↓
Position
  ↓
Journal
  ↓
Analytics
```

Changes must preserve workflow integrity.

Do not bypass workflow transitions by directly mutating persistence unless the architecture explicitly requires reconciliation or maintenance behavior.

---

## 19. Financial Correctness

Trading Cockpit handles financial information.

Correctness is more important than displaying additional metrics.

Never invent financial values.

If semantics are ambiguous, do not expose the metric until the correct interpretation is established.

Examples requiring particular care:

- available capital;
- deployed capital;
- open risk;
- realized P&L;
- unrealized P&L;
- multi-account aggregation;
- FX conversion;
- position sizing;
- portfolio exposure.

Prefer an omitted metric over a misleading metric.

---

## 20. Tests During Development

The user performs final repository validation manually.

During implementation:

1. run only targeted tests needed to develop and verify the changed feature;
2. iterate using those targeted tests;
3. run targeted TypeScript, lint, or build checks only when they are useful to the current change;
4. do not run the complete repository test suite unless explicitly requested.

This is important for development efficiency and agent token/tool usage.

Do not weaken or delete tests merely to make a change pass.

---

## 21. Final Validation

Final repository validation is performed by the user unless explicitly delegated to the agent.

Do not run the following commands unless explicitly requested:

```bash
npm run check
npm run deploy:prepare
git diff --check
git status
clasp status
```

At completion, report the exact validation commands the user should run manually.

Typical final validation commands may include:

```bash
npm run check
npm run deploy:prepare
git diff --check
git status
```

Use the actual scripts available in `package.json`.

Do not invent commands without inspecting the repository.

---

## 22. Apps Script Validation

Changes affecting Apps Script must preserve:

- required global functions;
- menu handlers;
- Apps Script entrypoints;
- manifest validity;
- absence of global function collisions.

Do not rename Apps Script globals casually.

Remember that Apps Script depends on globally visible entrypoints.

---

## 23. Deployment Safety

Never execute:

```bash
clasp push
```

unless the user explicitly asks for or authorizes deployment.

Never execute:

```bash
clasp pull
```

unless explicitly requested.

Before an authorized deployment:

1. run the required build;
2. run validation;
3. inspect the clasp deployment surface;
4. confirm only expected runtime files will be sent.

Do not deploy source React/TypeScript files.

---

## 24. Git Safety

Never push to GitHub unless explicitly requested.

Do not overwrite existing user changes.

Before significant modifications, inspect:

```bash
git status
```

If unrelated uncommitted changes exist, preserve them.

Do not silently reset, checkout, stash or discard user changes.

Do not combine unrelated architectural phases into one commit.

Only create commits when requested or when the task explicitly authorizes it.

---

## 25. Scope Discipline

Implement the requested phase only.

Do not opportunistically implement future phases.

For example, when implementing Watchlist, do not automatically implement:

- Trade Plan creation;
- Positions;
- Journal;
- Analytics;
- Administration.

A small amount of infrastructure preparation is acceptable when necessary for the current feature.

Avoid speculative frameworks and abstractions.

---

## 26. Refactoring Discipline

Do not combine a feature implementation with a broad unrelated refactor.

Prefer:

```text
small architectural extension
+
requested feature
```

over:

```text
rewrite existing system
+
requested feature
+
future architecture
```

Preserve existing behavior unless the task explicitly changes it.

---

## 27. Dependencies

Before adding a dependency, determine whether it provides enough value to justify:

- bundle size;
- maintenance;
- Apps Script compatibility;
- build complexity.

Avoid unnecessary dependencies.

Do not introduce:

- Nx;
- Turborepo;
- another monorepo framework;
- another state management framework;
- another backend framework;

without a demonstrated requirement.

---

## 28. Documentation Policy

Do NOT update project documentation during every implementation task unless:

- the user explicitly requests documentation;
- a change would otherwise leave critical developer instructions dangerously incorrect;
- documentation is part of the acceptance criteria.

The project already contains detailed documentation.

Prioritize implementation and validation.

Documentation will periodically be refreshed in dedicated documentation phases by inspecting the actual codebase.

Do not generate new ADRs for routine feature work unless explicitly requested.

Do not spend implementation time producing extensive Markdown reports.

The code and automated tests are the primary source of truth between documentation refresh phases.

---

## 29. Agent Reporting

Keep completion reports concise.

Do not produce long phase reports unless explicitly requested.

For normal implementation work, report:

1. what changed;
2. important architectural decisions;
3. tests/validation results;
4. limitations or remaining manual steps;
5. git status if relevant.

Avoid repeating the original prompt.

Avoid listing every modified file unless useful.

---

## 30. Efficient Agent Usage

Optimize implementation work for useful progress rather than exhaustive narration.

During exploration:

- inspect the files relevant to the requested feature first;
- follow imports/dependencies as needed;
- avoid repeatedly scanning the entire repository without reason.

During testing:

- use targeted tests while iterating;
- use the full suite at the end.

During reporting:

- summarize;
- do not generate extensive documentation unless requested.

Do not sacrifice correctness for token efficiency, but avoid unnecessary work.

---

## 31. Existing Behavior

Existing behavior is presumed intentional unless evidence shows otherwise.

Before changing behavior:

- inspect implementation;
- inspect tests;
- understand why it exists.

Do not "clean up" business rules merely because another implementation appears simpler.

---

## 32. Source of Truth Priority

When information conflicts, use this priority:

1. explicit current user instruction;
2. current repository code and tests;
3. this AGENTS.md;
4. project documentation;
5. historical assumptions.

The current repository must always be inspected before making architectural assumptions.

---

## 33. Definition of Done

Unless the task defines stricter criteria, implementation work is complete when:

- requested behavior is implemented;
- architecture boundaries are preserved;
- relevant targeted tests executed by the agent pass;
- no unrelated functionality was intentionally changed;
- no unauthorized deployment occurred;
- no unauthorized GitHub push occurred;
- remaining limitations are clearly stated;
- the agent provides the final validation commands for the user to execute manually.

Full repository validation is performed by the user unless explicitly delegated to the agent.

Do not start the next phase automatically.
