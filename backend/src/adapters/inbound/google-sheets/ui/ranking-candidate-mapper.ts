import type { AddCandidateToWatchlistCommand } from '@trading-cockpit/backend-core/application/watchlist/add-candidate-to-watchlist';
import type { WatchlistSnapshotValue } from '@trading-cockpit/backend-core/domain/watchlist';

function requireColumn(headers: string[], name: string): number {
  const expected = name.trim().toLowerCase();
  const index = headers.findIndex((header) => String(header).trim().toLowerCase() === expected);

  if (index === -1) {
    throw new Error(`Colonne absente : ${name}`);
  }

  return index;
}

function valueByHeader(headers: string[], row: unknown[], name: string): unknown {
  return row[requireColumn(headers, name)];
}

function snapshotValue(value: unknown): WatchlistSnapshotValue {
  if (value === null) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value;

  return value === undefined ? '' : String(value);
}

export function rankingRowToAddCandidateCommand(
  headers: string[],
  row: unknown[]
): AddCandidateToWatchlistCommand {
  return {
    strategyId: String(valueByHeader(headers, row, 'Strategy ID') || ''),
    strategyName: String(valueByHeader(headers, row, 'Strategy') || ''),
    strategyVersion: String(valueByHeader(headers, row, 'Strategy Version') || ''),
    signalDate: snapshotValue(valueByHeader(headers, row, 'Signal Date')),
    ticker: snapshotValue(valueByHeader(headers, row, 'Ticker')),
    company: snapshotValue(valueByHeader(headers, row, 'Company')),
    sector: snapshotValue(valueByHeader(headers, row, 'Sector')),
    signalPrice: snapshotValue(valueByHeader(headers, row, 'Price')),
    momentumScore: snapshotValue(valueByHeader(headers, row, 'Momentum Score'))
  };
}
