import type { Position, PositionSnapshotValue } from '@trading-cockpit/core/domain/position';
import { requireColumn } from '../sheet-headers';

export const POSITION_HEADERS = [
  'Position ID',
  'Trade Plan ID',
  'Watchlist ID',
  'Strategy ID',
  'Strategy',
  'Strategy Version',
  'Ticker',
  'Opened At',
  'Planned Entry',
  'Actual Entry',
  'Planned Quantity',
  'Actual Quantity',
  'Initial Stop',
  'Current Stop',
  'Target',
  'Planned Max Risk',
  'Planned R:R',
  'Current Price',
  'Unrealized P&L',
  'Unrealized P&L %',
  'Status',
  'Closed At',
  'Exit Price',
  'Realized P&L',
  'Notes',
  'Account ID'
] as const;

function valueByHeader(headers: string[], row: unknown[], name: string): unknown {
  return row[requireColumn(headers, name)];
}

function snapshotValue(value: unknown): PositionSnapshotValue {
  if (value === null) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value;

  return value === undefined ? '' : String(value);
}

function textValue(value: unknown): string {
  return String(value || '').trim();
}

export function positionFromRow(headers: string[], row: unknown[]): Position {
  return {
    id: textValue(valueByHeader(headers, row, 'Position ID')),
    accountId: textValue(valueByHeader(headers, row, 'Account ID')).toUpperCase(),
    tradePlanId: textValue(valueByHeader(headers, row, 'Trade Plan ID')),
    watchlistId: textValue(valueByHeader(headers, row, 'Watchlist ID')),
    strategyId: textValue(valueByHeader(headers, row, 'Strategy ID')),
    strategyName: textValue(valueByHeader(headers, row, 'Strategy')),
    strategyVersion: textValue(valueByHeader(headers, row, 'Strategy Version')),
    ticker: textValue(valueByHeader(headers, row, 'Ticker')),
    openedAt: snapshotValue(valueByHeader(headers, row, 'Opened At')),
    plannedEntry: snapshotValue(valueByHeader(headers, row, 'Planned Entry')),
    actualEntry: snapshotValue(valueByHeader(headers, row, 'Actual Entry')),
    plannedQuantity: snapshotValue(valueByHeader(headers, row, 'Planned Quantity')),
    actualQuantity: snapshotValue(valueByHeader(headers, row, 'Actual Quantity')),
    initialStop: snapshotValue(valueByHeader(headers, row, 'Initial Stop')),
    currentStop: snapshotValue(valueByHeader(headers, row, 'Current Stop')),
    target: snapshotValue(valueByHeader(headers, row, 'Target')),
    plannedMaxRisk: snapshotValue(valueByHeader(headers, row, 'Planned Max Risk')),
    plannedRiskReward: snapshotValue(valueByHeader(headers, row, 'Planned R:R')),
    currentPrice: snapshotValue(valueByHeader(headers, row, 'Current Price')),
    unrealizedPnl: snapshotValue(valueByHeader(headers, row, 'Unrealized P&L')),
    unrealizedPnlPercent: snapshotValue(valueByHeader(headers, row, 'Unrealized P&L %')),
    status: textValue(valueByHeader(headers, row, 'Status')),
    closedAt: snapshotValue(valueByHeader(headers, row, 'Closed At')),
    exitPrice: snapshotValue(valueByHeader(headers, row, 'Exit Price')),
    realizedPnl: snapshotValue(valueByHeader(headers, row, 'Realized P&L')),
    notes: textValue(valueByHeader(headers, row, 'Notes'))
  };
}

export function positionToRow(position: Position): PositionSnapshotValue[] {
  return [
    position.id,
    position.tradePlanId,
    position.watchlistId,
    position.strategyId,
    position.strategyName,
    position.strategyVersion,
    position.ticker,
    position.openedAt,
    position.plannedEntry,
    position.actualEntry,
    position.plannedQuantity,
    position.actualQuantity,
    position.initialStop,
    position.currentStop,
    position.target,
    position.plannedMaxRisk,
    position.plannedRiskReward,
    '',
    '',
    '',
    position.status,
    position.closedAt,
    position.exitPrice,
    position.realizedPnl,
    position.notes,
    position.accountId
  ];
}
