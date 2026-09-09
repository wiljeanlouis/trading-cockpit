import { FINVIZ_MOMENTUM_EXPORT_HEADERS } from '@trading-cockpit/contracts';
import { initializeCanonicalTableSheet } from '../data-sheet';
import { requireSheetHeaders } from '../sheet-headers';

const FINVIZ_SIGNALS_SHEET_NAME = 'Finviz Signals';

export const FINVIZ_SIGNALS_HEADERS = [
  'Strategy ID',
  'Strategy',
  'Strategy Version',
  'Refreshed At',
  ...FINVIZ_MOMENTUM_EXPORT_HEADERS
] as const;

export function getOrCreateFinvizSignalsSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  return initializeCanonicalTableSheet(FINVIZ_SIGNALS_SHEET_NAME, FINVIZ_SIGNALS_HEADERS);
}

export function validateFinvizSignalsHeaders(headers: readonly unknown[]): true {
  return requireSheetHeaders(headers, FINVIZ_SIGNALS_HEADERS, FINVIZ_SIGNALS_SHEET_NAME);
}
