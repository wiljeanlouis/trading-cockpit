# Architecture Decision Records

Architecture Decision Records capture why significant architectural choices were made.

ADRs are historical records. Do not rewrite old ADRs merely to make their examples match the current
repository layout. If a decision changes, add status or amendment metadata and create a newer ADR
when the change is significant.

Current architecture truth belongs in [docs/architecture.md](../architecture.md). Operational
procedures belong in [docs/operations.md](../operations.md).

## Statuses

- `Proposed`: under consideration.
- `Accepted`: current or historically accepted and still relevant.
- `Superseded`: replaced by a newer decision.
- `Deprecated`: intentionally retained for history but no longer recommended.

## Index

| ADR                                                                                        |            Status | Title                                                                      |
| ------------------------------------------------------------------------------------------ | ----------------: | -------------------------------------------------------------------------- |
| [0001](0001-use-typescript.md)                                                             |          Accepted | Adopt TypeScript progressively                                             |
| [0002](0002-use-modular-typescript-build.md)                                               | Accepted, amended | Use a modular TypeScript build                                             |
| [0003](0003-use-ports-and-adapters.md)                                                     |          Accepted | Use Ports and Adapters for progressive business-slice migration            |
| [0004](0004-migrate-business-formulas-to-core.md)                                          |          Accepted | Migrate business formulas progressively to the Core                        |
| [0005](0005-keep-trade-plans-single-execution.md)                                          |          Accepted | Keep Trade Plans single-execution during multi-account foundation          |
| [0006](0006-use-append-only-external-capital-ledger.md)                                    |          Accepted | Use an append-only external capital ledger                                 |
| [0007](0007-use-derived-realized-equity-for-account-owned-trade-plans.md)                  |          Accepted | Use derived realized equity for account-owned Trade Plans                  |
| [0008](0008-typescript-is-maintained-source.md)                                            | Accepted, amended | TypeScript is the maintained application source                            |
| [0009](0009-treat-market-signal-providers-as-adapters.md)                                  | Accepted, amended | Treat external market signal providers as adapters                         |
| [0010](0010-isolate-apps-script-under-backend.md)                                          |        Superseded | Isolate the Apps Script application under backend                          |
| [0011](0011-use-react-as-an-apps-script-inbound-adapter.md)                                |        Superseded | Use React as an Apps Script inbound adapter                                |
| [0012](0012-adopt-apps-packages-monorepo-architecture.md)                                  |          Accepted | Adopt apps/packages monorepo architecture                                  |
| [0013](0013-use-cloud-run-api-with-google-sheets-operational-datastore.md)                 |          Accepted | Use Cloud Run API with Google Sheets operational datastore                 |
| [0014](0014-establish-canonical-workbook-data-contracts-and-provider-snapshot-archival.md) |          Accepted | Establish canonical workbook data contracts and provider snapshot archival |
