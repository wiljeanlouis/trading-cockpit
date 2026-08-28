function requireColumn(headers: string[], name: string): number {
  const expected = name.trim().toLowerCase();
  const index = headers.findIndex((header) => String(header).trim().toLowerCase() === expected);

  if (index === -1) {
    throw new Error(`Colonne absente : ${name}`);
  }

  return index;
}

export function selectedTradePlanRowToCommand(
  headers: string[],
  row: unknown[]
): { tradePlanId: string } {
  return {
    tradePlanId: String(row[requireColumn(headers, 'Trade Plan ID')] || '')
  };
}
