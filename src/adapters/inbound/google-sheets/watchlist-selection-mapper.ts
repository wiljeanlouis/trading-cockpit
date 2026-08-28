function requireColumn(headers: string[], name: string): number {
  const expected = name.trim().toLowerCase();
  const index = headers.findIndex((header) => String(header).trim().toLowerCase() === expected);

  if (index === -1) {
    throw new Error(`Colonne absente : ${name}`);
  }

  return index;
}

export function selectedWatchlistRowToCommand(
  headers: string[],
  row: unknown[]
): { watchlistId: string } {
  return {
    watchlistId: String(row[requireColumn(headers, 'Watchlist ID')] || '')
  };
}
