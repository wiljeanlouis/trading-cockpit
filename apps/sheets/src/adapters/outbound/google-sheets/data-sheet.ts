import { getTradingCockpitSpreadsheet } from './trading-cockpit-spreadsheet';

export const DATA_SHEET_HEADER_ROW = 1;
export const DATA_SHEET_DATA_START_ROW = 2;

export function initializeCanonicalTableSheet(
  sheetName: string,
  headers: readonly string[]
): GoogleAppsScript.Spreadsheet.Sheet {
  const spreadsheet = getTradingCockpitSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName) ?? spreadsheet.insertSheet(sheetName);
  sheet.clear();
  sheet
    .getRange(DATA_SHEET_HEADER_ROW, 1, 1, headers.length)
    .setValues([[...headers]])
    .setFontWeight('bold');
  sheet.setFrozenRows(DATA_SHEET_HEADER_ROW);
  sheet.autoResizeColumns(1, headers.length);
  return sheet;
}

export function isSheetEffectivelyEmpty(sheet: GoogleAppsScript.Spreadsheet.Sheet): boolean {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  return lastRow === 0 || lastColumn === 0;
}
