export function requireColumn(headers: readonly unknown[], name: string): number {
  const expected = String(name).trim().toLowerCase();
  const index = headers.findIndex((header) => String(header).trim().toLowerCase() === expected);
  if (index === -1) throw new Error(`Colonne absente : ${name}`);
  return index;
}

export function readSheetHeaders(sheet: GoogleAppsScript.Spreadsheet.Sheet): string[] {
  return sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map((value) => String(value).trim());
}

export interface SheetTableData {
  headers: string[];
  rows: unknown[][];
}

export function readSheetTable(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  headerRow = 1
): SheetTableData {
  const lastColumn = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();
  const rowCount = Math.max(lastRow - headerRow + 1, 1);
  const values = sheet.getRange(headerRow, 1, rowCount, lastColumn).getValues();
  const headers = (values[0] ?? []).map((value) => String(value).trim());
  return {
    headers,
    rows: lastRow <= headerRow ? [] : values.slice(1)
  };
}

export function requireSheetHeaders(
  headers: readonly unknown[],
  requiredHeaders: readonly string[],
  sheetName: string
): true {
  for (const header of requiredHeaders) {
    if (!headers.map((value) => String(value).trim()).includes(header)) {
      throw new Error(`${sheetName} utilise un ancien schéma. Colonne absente : ${header}`);
    }
  }
  return true;
}
