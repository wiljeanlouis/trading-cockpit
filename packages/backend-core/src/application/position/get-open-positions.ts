import type { OpenPositionsDto, PositionItemDto } from '@trading-cockpit/contracts';
import {
  isOpenPositionStatus,
  type Position,
  type PositionSnapshotValue
} from '../../domain/position';
import type { PositionReader } from '../../ports/outbound/position-reader';

export interface GetOpenPositionsDependencies {
  reader: PositionReader;
  now: () => Date;
}

function nullableText(value: PositionSnapshotValue): string | null {
  const text = String(value ?? '').trim();
  return text || null;
}

function nullableNumber(value: PositionSnapshotValue): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function serializedDate(value: PositionSnapshotValue): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  return nullableText(value);
}

function toItem(position: Position): PositionItemDto {
  return {
    id: position.id,
    accountId: position.accountId,
    tradePlanId: position.tradePlanId,
    watchlistId: position.watchlistId,
    ticker: position.ticker,
    strategyId: position.strategyId,
    strategyName: position.strategyName,
    strategyVersion: position.strategyVersion,
    openedAt: serializedDate(position.openedAt),
    plannedEntry: nullableNumber(position.plannedEntry),
    actualEntry: nullableNumber(position.actualEntry),
    plannedQuantity: nullableNumber(position.plannedQuantity),
    actualQuantity: nullableNumber(position.actualQuantity),
    initialStop: nullableNumber(position.initialStop),
    currentStop: nullableNumber(position.currentStop),
    target: nullableNumber(position.target),
    plannedMaxRisk: nullableNumber(position.plannedMaxRisk),
    plannedRiskReward: nullableNumber(position.plannedRiskReward),
    currentPrice: nullableNumber(position.currentPrice),
    unrealizedPnl: nullableNumber(position.unrealizedPnl),
    unrealizedPnlPercent: nullableNumber(position.unrealizedPnlPercent),
    status: position.status,
    notes: nullableText(position.notes)
  };
}

export function createGetOpenPositions({
  reader,
  now
}: GetOpenPositionsDependencies): () => OpenPositionsDto {
  return () => ({
    generatedAt: now().toISOString(),
    items: reader
      .findAll()
      .filter((position) => isOpenPositionStatus(position.status))
      .map(toItem)
  });
}
