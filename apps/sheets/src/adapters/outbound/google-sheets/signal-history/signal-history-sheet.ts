import { SIGNALS_HISTORY_HEADERS } from '@trading-cockpit/contracts';
import { initializeCanonicalTableSheet } from '../data-sheet';
import { requireSheetHeaders } from '../sheet-headers';

const SIGNALS_HISTORY_SHEET_NAME = 'Signals History';

export function getOrCreateSignalHistorySheet(): GoogleAppsScript.Spreadsheet.Sheet {
  return initializeCanonicalTableSheet(SIGNALS_HISTORY_SHEET_NAME, SIGNALS_HISTORY_HEADERS);
}

export function validateSignalHistoryHeaders(headers: readonly unknown[]): true {
  return requireSheetHeaders(headers, SIGNALS_HISTORY_HEADERS, SIGNALS_HISTORY_SHEET_NAME);
}
