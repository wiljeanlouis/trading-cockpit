# ADR 0013: Use Cloud Run API with Google Sheets operational datastore

- Status: Accepted
- Date: 2026-08-31
- Supersedes: ADR 0011

## Context

React became the primary operational UI. Apps Script RPC introduced runtime and transport limits,
while the existing Google Sheets workbook remains the practical source of truth for the current
version.

## Decision

Use `apps/api` as the production HTTP backend deployed to Cloud Run. The API serves the production
React build, verifies Google identity, authorizes allowed users, invokes `packages/core` use
cases/queries, and reads/writes the existing Google Sheets workbook through Google Sheets API
adapters.

Google Sheets remains the operational datastore for this migration. `apps/sheets` remains supported
for spreadsheet menu/UI workflows, workbook initialization/validation, and Sheets projections.

## Consequences

React no longer depends on Apps Script HtmlService or `google.script.run` for production operation.
Cloud Run and Apps Script can both use the same core behavior through separate adapters. The
workbook remains a shared concurrent resource, so cross-sheet transaction limitations still require
careful workflow design.
