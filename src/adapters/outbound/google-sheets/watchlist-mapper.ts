import type { WatchlistEntry, WatchlistSnapshotValue } from '../../../core/domain/watchlist';

export const WATCHLIST_HEADERS = [
  'Watchlist ID',
  'Strategy ID',
  'Strategy',
  'Strategy Version',
  'Signal Date',
  'Ticker',
  'Company',
  'Sector',
  'Added At',
  'Signal Price',
  'Current Price',
  'Change Since Signal',
  'Momentum Score',
  'Status',
  'Setup Status',
  'Breakout Level',
  'Distance to Breakout',
  'Invalidation Level',
  'Earnings Date',
  'Event Risk',
  'Notes',
  'Closed At'
] as const;

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
  if (
    value === null ||
    value instanceof Date ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  return value === undefined ? '' : String(value);
}

function textValue(value: unknown): string {
  return String(value || '').trim();
}

export function watchlistEntryFromRow(headers: string[], row: unknown[]): WatchlistEntry {
  return {
    id: textValue(valueByHeader(headers, row, 'Watchlist ID')),
    strategyId: textValue(valueByHeader(headers, row, 'Strategy ID')),
    strategyName: textValue(valueByHeader(headers, row, 'Strategy')),
    strategyVersion: textValue(valueByHeader(headers, row, 'Strategy Version')),
    signalDate: snapshotValue(valueByHeader(headers, row, 'Signal Date')),
    ticker: textValue(valueByHeader(headers, row, 'Ticker')),
    company: snapshotValue(valueByHeader(headers, row, 'Company')),
    sector: snapshotValue(valueByHeader(headers, row, 'Sector')),
    addedAt: snapshotValue(valueByHeader(headers, row, 'Added At')),
    signalPrice: snapshotValue(valueByHeader(headers, row, 'Signal Price')),
    momentumScore: snapshotValue(valueByHeader(headers, row, 'Momentum Score')),
    status: textValue(valueByHeader(headers, row, 'Status')),
    setupStatus: textValue(valueByHeader(headers, row, 'Setup Status')),
    breakoutLevel: snapshotValue(valueByHeader(headers, row, 'Breakout Level')),
    invalidationLevel: snapshotValue(valueByHeader(headers, row, 'Invalidation Level')),
    earningsDate: snapshotValue(valueByHeader(headers, row, 'Earnings Date')),
    eventRisk: textValue(valueByHeader(headers, row, 'Event Risk')),
    notes: textValue(valueByHeader(headers, row, 'Notes')),
    closedAt: snapshotValue(valueByHeader(headers, row, 'Closed At'))
  };
}

export function watchlistEntryToRow(entry: WatchlistEntry): WatchlistSnapshotValue[] {
  return [
    entry.id,
    entry.strategyId,
    entry.strategyName,
    entry.strategyVersion,
    entry.signalDate,
    entry.ticker,
    entry.company,
    entry.sector,
    entry.addedAt,
    entry.signalPrice,
    '',
    '',
    entry.momentumScore,
    entry.status,
    entry.setupStatus,
    entry.breakoutLevel,
    '',
    entry.invalidationLevel,
    entry.earningsDate,
    entry.eventRisk,
    entry.notes,
    entry.closedAt
  ];
}
