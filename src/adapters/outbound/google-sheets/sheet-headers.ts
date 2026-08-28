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
