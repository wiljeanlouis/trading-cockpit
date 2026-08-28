import { WATCHLIST_HEADERS } from './watchlist-mapper';
import { readSheetHeaders, requireColumn } from '../sheet-headers';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';

const SHEET_NAME = 'Watchlist';
declare function themeWatchlist(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): void;

export function getOrCreateWatchlistSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const spreadsheet = getTradingCockpitSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (sheet) return sheet;
  sheet = spreadsheet.insertSheet(SHEET_NAME);
  sheet.getRange(1, 1, 1, WATCHLIST_HEADERS.length).setValues([[...WATCHLIST_HEADERS]]);
  sheet.setFrozenRows(1);
  refreshWatchlistValidations();
  sheet.autoResizeColumns(1, WATCHLIST_HEADERS.length);
  themeWatchlist(spreadsheet);
  return sheet;
}

export function validateWatchlistSchema(sheet: GoogleAppsScript.Spreadsheet.Sheet): true {
  const headers = readSheetHeaders(sheet);
  WATCHLIST_HEADERS.forEach((header) => {
    if (!headers.includes(header)) {
      throw new Error(`Watchlist utilise un ancien schéma. Colonne absente : ${header}`);
    }
  });
  return true;
}

export function addWatchlistFormulas(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void {
  sheet.getRange(row, 11).setFormula(`=IFERROR(GOOGLEFINANCE(F${row},"price"),"")`);
  sheet.getRange(row, 12).setFormula(`=IF(OR(J${row}="",K${row}=""),"",K${row}/J${row}-1)`);
  sheet.getRange(row, 17).setFormula(`=IF(OR(K${row}="",P${row}=""),"",K${row}/P${row}-1)`);
}

export function formatWatchlistRow(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void {
  sheet.getRange(row, 5).setNumberFormat('yyyy-mm-dd');
  sheet.getRange(row, 9).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange(row, 10).setNumberFormat('$0.00');
  sheet.getRange(row, 11).setNumberFormat('$0.00');
  sheet.getRange(row, 12).setNumberFormat('0.00%');
  sheet.getRange(row, 13).setNumberFormat('0');
  sheet.getRange(row, 16).setNumberFormat('$0.00');
  sheet.getRange(row, 17).setNumberFormat('0.00%');
  sheet.getRange(row, 18).setNumberFormat('$0.00');
  sheet.getRange(row, 19).setNumberFormat('yyyy-mm-dd');
  sheet.getRange(row, 22).setNumberFormat('yyyy-mm-dd hh:mm:ss');
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
      ['NEAR BREAKOUT', 'BREAKOUT', 'CONFIRMED', 'FAILED BREAKOUT', 'EXTENDED'],
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
