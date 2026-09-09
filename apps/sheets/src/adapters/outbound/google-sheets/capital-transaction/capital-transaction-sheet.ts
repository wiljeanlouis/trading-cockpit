import { initializeCanonicalTableSheet } from '../data-sheet';
import { requireSheetHeaders } from '../sheet-headers';
import { CAPITAL_LEDGER_HEADERS } from './capital-transaction-mapper';

const CAPITAL_LEDGER_SHEET_NAME = 'Capital Ledger';

export function getOrCreateCapitalLedgerSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  return initializeCanonicalTableSheet(CAPITAL_LEDGER_SHEET_NAME, CAPITAL_LEDGER_HEADERS);
}

export function validateCapitalLedgerHeaders(headers: readonly unknown[]): true {
  return requireSheetHeaders(headers, CAPITAL_LEDGER_HEADERS, CAPITAL_LEDGER_SHEET_NAME);
}
