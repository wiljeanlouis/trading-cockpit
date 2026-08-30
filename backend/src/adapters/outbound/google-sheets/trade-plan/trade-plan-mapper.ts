import type { TradePlan, TradePlanSnapshotValue } from '../../../../core/domain/trade-plan';
import { requireColumn } from '../sheet-headers';

export const TRADE_PLAN_HEADERS = [
  'Trade Plan ID',
  'Watchlist ID',
  'Strategy ID',
  'Strategy',
  'Strategy Version',
  'Signal Date',
  'Signal Price',
  'Ticker',
  'Reference Price',
  'Momentum Score',
  'Setup Status',
  'Breakout Level',
  'Invalidation Level',
  'Event Risk',
  'Created At',
  'Entry Type',
  'Entry Price',
  'Stop Price',
  'Target Price',
  'Risk / Share',
  'Reward / Share',
  'Risk : Reward',
  'Account Equity',
  'Risk %',
  'Max Risk $',
  'Position Size',
  'Position Value',
  'Status',
  'Notes',
  'Account ID'
] as const;

function valueByHeader(headers: string[], row: unknown[], name: string): unknown {
  return row[requireColumn(headers, name)];
}

function snapshotValue(value: unknown): TradePlanSnapshotValue {
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

function numberValue(value: unknown): number {
  return Number(value);
}

export function tradePlanFromRow(headers: string[], row: unknown[]): TradePlan {
  return {
    id: textValue(valueByHeader(headers, row, 'Trade Plan ID')),
    accountId: textValue(valueByHeader(headers, row, 'Account ID')).toUpperCase(),
    watchlistId: textValue(valueByHeader(headers, row, 'Watchlist ID')),
    strategyId: textValue(valueByHeader(headers, row, 'Strategy ID')),
    strategyName: textValue(valueByHeader(headers, row, 'Strategy')),
    strategyVersion: textValue(valueByHeader(headers, row, 'Strategy Version')),
    signalDate: snapshotValue(valueByHeader(headers, row, 'Signal Date')),
    signalPrice: snapshotValue(valueByHeader(headers, row, 'Signal Price')),
    ticker: textValue(valueByHeader(headers, row, 'Ticker')),
    referencePrice: snapshotValue(valueByHeader(headers, row, 'Reference Price')),
    momentumScore: snapshotValue(valueByHeader(headers, row, 'Momentum Score')),
    setupStatus: textValue(valueByHeader(headers, row, 'Setup Status')),
    breakoutLevel: snapshotValue(valueByHeader(headers, row, 'Breakout Level')),
    invalidationLevel: snapshotValue(valueByHeader(headers, row, 'Invalidation Level')),
    eventRisk: textValue(valueByHeader(headers, row, 'Event Risk')),
    createdAt: snapshotValue(valueByHeader(headers, row, 'Created At')),
    entryType: textValue(valueByHeader(headers, row, 'Entry Type')),
    entryPrice: snapshotValue(valueByHeader(headers, row, 'Entry Price')),
    stopPrice: snapshotValue(valueByHeader(headers, row, 'Stop Price')),
    targetPrice: snapshotValue(valueByHeader(headers, row, 'Target Price')),
    riskPerShare: snapshotValue(valueByHeader(headers, row, 'Risk / Share')),
    rewardPerShare: snapshotValue(valueByHeader(headers, row, 'Reward / Share')),
    riskReward: snapshotValue(valueByHeader(headers, row, 'Risk : Reward')),
    accountEquity: numberValue(valueByHeader(headers, row, 'Account Equity')),
    riskPercent: numberValue(valueByHeader(headers, row, 'Risk %')),
    maxRisk: snapshotValue(valueByHeader(headers, row, 'Max Risk $')),
    positionSize: snapshotValue(valueByHeader(headers, row, 'Position Size')),
    positionValue: snapshotValue(valueByHeader(headers, row, 'Position Value')),
    status: textValue(valueByHeader(headers, row, 'Status')),
    notes: textValue(valueByHeader(headers, row, 'Notes'))
  };
}

export function tradePlanToRow(tradePlan: TradePlan): TradePlanSnapshotValue[] {
  return [
    tradePlan.id,
    tradePlan.watchlistId,
    tradePlan.strategyId,
    tradePlan.strategyName,
    tradePlan.strategyVersion,
    tradePlan.signalDate,
    tradePlan.signalPrice,
    tradePlan.ticker,
    tradePlan.referencePrice,
    tradePlan.momentumScore,
    tradePlan.setupStatus,
    tradePlan.breakoutLevel,
    tradePlan.invalidationLevel,
    tradePlan.eventRisk,
    tradePlan.createdAt,
    tradePlan.entryType,
    tradePlan.entryPrice,
    tradePlan.stopPrice,
    tradePlan.targetPrice,
    '',
    '',
    '',
    tradePlan.accountEquity,
    tradePlan.riskPercent,
    '',
    '',
    '',
    tradePlan.status,
    tradePlan.notes,
    tradePlan.accountId
  ];
}
