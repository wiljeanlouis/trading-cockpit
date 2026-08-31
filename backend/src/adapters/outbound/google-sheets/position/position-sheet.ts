import { POSITION_HEADERS } from './position-mapper';
import { readSheetHeaders, requireColumn, requireSheetHeaders } from '../sheet-headers';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
import { themePositions } from '../../../inbound/google-sheets/theme/theme';
import { isSheetEffectivelyEmpty } from '../data-sheet';

const SHEET_NAME = 'Positions';

export function getOrCreatePositionsSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const spreadsheet = getTradingCockpitSpreadsheet();
  const existing = spreadsheet.getSheetByName(SHEET_NAME);
  if (existing && !isSheetEffectivelyEmpty(existing)) return existing;

  const sheet = existing ?? spreadsheet.insertSheet(SHEET_NAME);
  sheet.clear();
  sheet
    .getRange(1, 1, 1, POSITION_HEADERS.length)
    .setValues([Array.from(POSITION_HEADERS)])
    .setFontWeight('bold');
  sheet.setFrozenRows(1);
  refreshPositionValidations(sheet);
  sheet.autoResizeColumns(1, POSITION_HEADERS.length);
  themePositions(spreadsheet);
  return sheet;
}

export function validatePositionsSchema(sheet: GoogleAppsScript.Spreadsheet.Sheet): boolean {
  return validatePositionsHeaders(readSheetHeaders(sheet));
}

export function validatePositionsHeaders(headers: readonly unknown[]): true {
  return requireSheetHeaders(headers, POSITION_HEADERS, 'Positions');
}

export function ensurePositionAccountColumn(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
  const headers = readSheetHeaders(sheet);
  if (!headers.includes('Account ID')) {
    sheet
      .getRange(1, sheet.getLastColumn() + 1)
      .setValue('Account ID')
      .setFontWeight('bold');
  }
}

export function refreshPositionValidations(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
  const statusColumn = requireColumn(readSheetHeaders(sheet), 'Status') + 1;
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['OPEN', 'CLOSED', 'STOPPED', 'TARGET HIT'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, statusColumn, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
}

export function addPositionFormulas(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void {
  sheet.getRange(row, 18).setFormula(`=IFERROR(GOOGLEFINANCE(G${row},"price"),"")`);
  sheet
    .getRange(row, 19)
    .setFormula(`=IF(OR(R${row}="",J${row}="",L${row}=""),"",(R${row}-J${row})*L${row})`);
  sheet.getRange(row, 20).setFormula(`=IF(OR(R${row}="",J${row}=""),"",R${row}/J${row}-1)`);
}

export function formatPositionRow(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void {
  sheet.getRange(row, 8).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange(row, 9, 1, 2).setNumberFormat('$0.00');
  sheet.getRange(row, 11, 1, 2).setNumberFormat('0');
  sheet.getRange(row, 13, 1, 3).setNumberFormat('$0.00');
  sheet.getRange(row, 16).setNumberFormat('$0.00');
  sheet.getRange(row, 17).setNumberFormat('0.00');
  sheet.getRange(row, 18).setNumberFormat('$0.00');
  sheet.getRange(row, 19).setNumberFormat('$0.00');
  sheet.getRange(row, 20).setNumberFormat('0.00%');
  sheet.getRange(row, 22).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange(row, 23).setNumberFormat('$0.00');
  sheet.getRange(row, 24).setNumberFormat('$0.00');
}
