export const DATA_SHEET_HEADER_ROW = 1;
export const DATA_SHEET_DATA_START_ROW = 2;

export function isSheetEffectivelyEmpty(sheet: GoogleAppsScript.Spreadsheet.Sheet): boolean {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  return lastRow === 0 || lastColumn === 0;
}
