import type { JournalEntry } from '../../../core/domain/journal-entry';
import type { PositionSnapshotValue } from '../../../core/domain/position';

export const JOURNAL_HEADERS = [
  'Journal ID',
  'Position ID',
  'Trade Plan ID',
  'Watchlist ID',
  'Strategy ID',
  'Strategy',
  'Strategy Version',
  'Ticker',
  'Opened At',
  'Closed At',
  'Planned Entry',
  'Actual Entry',
  'Exit Price',
  'Quantity',
  'Initial Stop',
  'Target',
  'Planned Max Risk',
  'Planned R:R',
  'Realized P&L',
  'Return %',
  'R-Multiple',
  'Outcome',
  'Exit Reason',
  'Execution Notes',
  'Lessons Learned',
  'Followed Plan?'
] as const;

function requireColumn(headers: string[], name: string): number {
  const expected = name.trim().toLowerCase();
  const index = headers.findIndex((header) => String(header).trim().toLowerCase() === expected);
  if (index === -1) throw new Error(`Colonne absente : ${name}`);
  return index;
}

function value(headers: string[], row: unknown[], name: string): unknown {
  return row[requireColumn(headers, name)];
}

function snapshot(input: unknown): PositionSnapshotValue {
  if (
    input === null ||
    input instanceof Date ||
    ['string', 'number', 'boolean'].includes(typeof input)
  ) {
    return input as PositionSnapshotValue;
  }
  return input === undefined ? '' : String(input);
}

function text(input: unknown): string {
  return String(input || '').trim();
}
function metric(input: unknown): JournalEntry['returnPercent'] {
  return input === '' || input === null || input === undefined ? null : Number(input);
}

export function journalEntryFromRow(headers: string[], row: unknown[]): JournalEntry {
  const outcome = text(value(headers, row, 'Outcome'));
  return {
    id: text(value(headers, row, 'Journal ID')),
    positionId: text(value(headers, row, 'Position ID')),
    tradePlanId: text(value(headers, row, 'Trade Plan ID')),
    watchlistId: text(value(headers, row, 'Watchlist ID')),
    strategyId: text(value(headers, row, 'Strategy ID')),
    strategyName: text(value(headers, row, 'Strategy')),
    strategyVersion: text(value(headers, row, 'Strategy Version')),
    ticker: text(value(headers, row, 'Ticker')),
    openedAt: snapshot(value(headers, row, 'Opened At')),
    closedAt: snapshot(value(headers, row, 'Closed At')),
    plannedEntry: snapshot(value(headers, row, 'Planned Entry')),
    actualEntry: snapshot(value(headers, row, 'Actual Entry')),
    exitPrice: snapshot(value(headers, row, 'Exit Price')),
    quantity: snapshot(value(headers, row, 'Quantity')),
    initialStop: snapshot(value(headers, row, 'Initial Stop')),
    target: snapshot(value(headers, row, 'Target')),
    plannedMaxRisk: snapshot(value(headers, row, 'Planned Max Risk')),
    plannedRiskReward: snapshot(value(headers, row, 'Planned R:R')),
    realizedPnl: snapshot(value(headers, row, 'Realized P&L')),
    returnPercent: metric(value(headers, row, 'Return %')),
    rMultiple: metric(value(headers, row, 'R-Multiple')),
    outcome: outcome === 'WIN' || outcome === 'LOSS' || outcome === 'BREAKEVEN' ? outcome : null,
    exitReason: text(value(headers, row, 'Exit Reason')),
    executionNotes: text(value(headers, row, 'Execution Notes')),
    lessonsLearned: text(value(headers, row, 'Lessons Learned')),
    followedPlan: text(value(headers, row, 'Followed Plan?'))
  };
}

export function journalEntriesFromRowsForPosition(
  headers: string[],
  rows: unknown[][],
  positionId: string
): JournalEntry[] {
  const normalizedPositionId = String(positionId || '').trim();
  return rows
    .map((row) => journalEntryFromRow(headers, row))
    .filter((entry) => entry.positionId === normalizedPositionId);
}

export function journalEntryToRow(entry: JournalEntry): PositionSnapshotValue[] {
  return [
    entry.id,
    entry.positionId,
    entry.tradePlanId,
    entry.watchlistId,
    entry.strategyId,
    entry.strategyName,
    entry.strategyVersion,
    entry.ticker,
    entry.openedAt,
    entry.closedAt,
    entry.plannedEntry,
    entry.actualEntry,
    entry.exitPrice,
    entry.quantity,
    entry.initialStop,
    entry.target,
    entry.plannedMaxRisk,
    entry.plannedRiskReward,
    entry.realizedPnl,
    '',
    '',
    '',
    entry.exitReason,
    entry.executionNotes,
    entry.lessonsLearned,
    entry.followedPlan
  ];
}
