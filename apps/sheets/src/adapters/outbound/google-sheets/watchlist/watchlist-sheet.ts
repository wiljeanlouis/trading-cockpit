import { WATCHLIST_HEADERS } from './watchlist-mapper';
import { readSheetHeaders, requireColumn, requireSheetHeaders } from '../sheet-headers';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
import { initializeCanonicalTableSheet, isSheetEffectivelyEmpty } from '../data-sheet';

const SHEET_NAME = 'Watchlist';

export function getOrCreateWatchlistSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const spreadsheet = getTradingCockpitSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (sheet && !isSheetEffectivelyEmpty(sheet)) return sheet;
  sheet = initializeCanonicalTableSheet(SHEET_NAME, WATCHLIST_HEADERS);
  refreshWatchlistValidations();
  return sheet;
}

export function validateWatchlistSchema(sheet: GoogleAppsScript.Spreadsheet.Sheet): true {
  return validateWatchlistHeaders(readSheetHeaders(sheet));
}

export function validateWatchlistHeaders(headers: readonly unknown[]): true {
  return requireSheetHeaders(headers, WATCHLIST_HEADERS, 'Watchlist');
}

export function addWatchlistFormulas(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void {
  sheet.getRange(row, 10).setFormula(`=IFERROR(GOOGLEFINANCE(E${row},"price"),"")`);
  sheet.getRange(row, 11).setFormula(`=IF(OR(I${row}="",J${row}=""),"",J${row}/I${row}-1)`);
  sheet.getRange(row, 15).setFormula(`=IF(OR(J${row}="",N${row}=""),"",J${row}/N${row}-1)`);
}

export function formatWatchlistRow(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void {
  sheet.getRange(row, 4).setNumberFormat('yyyy-mm-dd');
  sheet.getRange(row, 8).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange(row, 9).setNumberFormat('$0.00');
  sheet.getRange(row, 10).setNumberFormat('$0.00');
  sheet.getRange(row, 11).setNumberFormat('0.00%');
  sheet.getRange(row, 14).setNumberFormat('$0.00');
  sheet.getRange(row, 15).setNumberFormat('0.00%');
  sheet.getRange(row, 16).setNumberFormat('$0.00');
  sheet.getRange(row, 17).setNumberFormat('yyyy-mm-dd');
  sheet.getRange(row, 20).setNumberFormat('yyyy-mm-dd hh:mm:ss');
}

export function refreshWatchlistValidations(): void {
  const spreadsheet = getTradingCockpitSpreadsheet();
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('La Watchlist n’existe pas.');
  const headers = readSheetHeaders(sheet);
  const rules = [
    [
      requireColumn(headers, 'Status') + 1,
      ['WATCHING', 'READY', 'PLANNED', 'ENTERED', 'CLOSED', 'REJECTED'],
      false
    ],
    [
      requireColumn(headers, 'Setup Status') + 1,
      ['WAITING_FOR_SETUP', 'WAITING_FOR_TRIGGER', 'TRIGGERED', 'INVALIDATED'],
      true
    ],
    [
      requireColumn(headers, 'Event Risk') + 1,
      ['CLEAR', 'EARNINGS SOON', 'EARNINGS TODAY', 'POST EARNINGS', 'OTHER'],
      true
    ]
  ] as const;
  rules.forEach(([column, values, allowInvalid]) => {
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList([...values], true)
      .setAllowInvalid(allowInvalid)
      .build();
    sheet.getRange(2, column, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
  });
  spreadsheet.toast('Validations de la Watchlist mises à jour.', 'Trading Cockpit', 5);
}
