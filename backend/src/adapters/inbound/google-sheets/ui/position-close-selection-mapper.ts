import type { ClosePositionCommand } from '@trading-cockpit/backend-core/application/position/close-position';

function requireColumn(headers: string[], name: string): number {
  const expected = name.trim().toLowerCase();
  const index = headers.findIndex((header) => String(header).trim().toLowerCase() === expected);
  if (index === -1) throw new Error(`Colonne absente : ${name}`);
  return index;
}

function value(headers: string[], row: unknown[], name: string): unknown {
  return row[requireColumn(headers, name)];
}

export interface SelectedPositionForClose {
  positionId: string;
  ticker: string;
}

export function selectedPositionId(headers: string[], row: unknown[]): string {
  const positionId = value(headers, row, 'Position ID');
  if (!positionId) throw new Error('Position ID absent.');
  return String(positionId).trim();
}

export function selectedPositionForClose(
  headers: string[],
  row: unknown[]
): SelectedPositionForClose {
  const positionId = selectedPositionId(headers, row);
  const watchlistId = value(headers, row, 'Watchlist ID');
  const strategyId = value(headers, row, 'Strategy ID');
  const ticker = value(headers, row, 'Ticker');
  const status = String(value(headers, row, 'Status') || '')
    .trim()
    .toUpperCase();

  if (!watchlistId) throw new Error('Watchlist ID absent.');
  if (!strategyId) throw new Error('Strategy ID absent.');
  if (status !== 'OPEN') throw new Error(`${ticker} n'est pas une position OPEN.`);

  return { positionId, ticker: String(ticker) };
}

export function closePositionCommand(
  positionId: string,
  responseText: string
): ClosePositionCommand {
  const exitPrice = Number(String(responseText).trim().replace(',', '.'));
  if (!Number.isFinite(exitPrice) || exitPrice <= 0) {
    throw new Error('Le prix de sortie doit être supérieur à 0.');
  }
  return { positionId, exitPrice };
}
