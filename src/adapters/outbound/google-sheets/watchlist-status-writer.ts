interface WatchlistStatusRange {
  getValues(): unknown[][];
  setValue(value: string): void;
}

export interface WatchlistStatusSheet {
  getLastRow(): number;
  getLastColumn(): number;
  getRange(
    row: number,
    column: number,
    rowCount?: number,
    columnCount?: number
  ): WatchlistStatusRange;
}

export function updateWatchlistStatusInSheet(
  sheet: WatchlistStatusSheet,
  watchlistId: string,
  newStatus: string
): void {
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    throw new Error(`Watchlist vide pour ID ${watchlistId}.`);
  }

  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map((value) => String(value).trim());
  const idIndex = requireWatchlistColumn(headers, 'Watchlist ID');
  const statusIndex = requireWatchlistColumn(headers, 'Status');
  const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const normalizedId = String(watchlistId).trim();

  for (let index = 0; index < rows.length; index += 1) {
    if (String(rows[index][idIndex] || '').trim() === normalizedId) {
      sheet.getRange(index + 2, statusIndex + 1).setValue(newStatus);
      return;
    }
  }

  throw new Error(`Watchlist ID introuvable : ${watchlistId}`);
}

function requireWatchlistColumn(headers: string[], name: string): number {
  const expected = name.trim().toLowerCase();
  const index = headers.findIndex((header) => header.trim().toLowerCase() === expected);

  if (index === -1) {
    throw new Error(`Colonne absente : ${name}`);
  }

  return index;
}
