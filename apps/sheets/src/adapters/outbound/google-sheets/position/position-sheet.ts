import { POSITION_HEADERS } from './position-mapper';
import { readSheetHeaders, requireColumn, requireSheetHeaders } from '../sheet-headers';
import { getTradingCockpitSpreadsheet } from '../trading-cockpit-spreadsheet';
import { initializeCanonicalTableSheet, isSheetEffectivelyEmpty } from '../data-sheet';

const SHEET_NAME = 'Positions';

export function getOrCreatePositionsSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const spreadsheet = getTradingCockpitSpreadsheet();
  const existing = spreadsheet.getSheetByName(SHEET_NAME);
  if (existing && !isSheetEffectivelyEmpty(existing)) return existing;

  const sheet = initializeCanonicalTableSheet(SHEET_NAME, POSITION_HEADERS);
  refreshPositionValidations(sheet);
  return sheet;
}

export function validatePositionsSchema(sheet: GoogleAppsScript.Spreadsheet.Sheet): boolean {
  return validatePositionsHeaders(readSheetHeaders(sheet));
}

export function validatePositionsHeaders(headers: readonly unknown[]): true {
  return requireSheetHeaders(headers, POSITION_HEADERS, 'Positions');
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
  sheet.getRange(row, 17).setFormula(`=IFERROR(GOOGLEFINANCE(F${row},"price"),"")`);
  sheet
    .getRange(row, 18)
    .setFormula(`=IF(OR(Q${row}="",I${row}="",K${row}=""),"",(Q${row}-I${row})*K${row})`);
  sheet.getRange(row, 19).setFormula(`=IF(OR(Q${row}="",I${row}=""),"",Q${row}/I${row}-1)`);
}

export function formatPositionRow(sheet: GoogleAppsScript.Spreadsheet.Sheet, row: number): void {
  sheet.getRange(row, 7).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange(row, 8, 1, 2).setNumberFormat('$0.00');
  sheet.getRange(row, 10, 1, 2).setNumberFormat('0');
  sheet.getRange(row, 12, 1, 3).setNumberFormat('$0.00');
  sheet.getRange(row, 15).setNumberFormat('$0.00');
  sheet.getRange(row, 16).setNumberFormat('0.00');
  sheet.getRange(row, 17).setNumberFormat('$0.00');
  sheet.getRange(row, 18).setNumberFormat('$0.00');
  sheet.getRange(row, 19).setNumberFormat('0.00%');
  sheet.getRange(row, 21).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange(row, 22).setNumberFormat('$0.00');
  sheet.getRange(row, 23).setNumberFormat('$0.00');
}
