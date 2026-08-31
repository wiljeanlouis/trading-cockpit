import type { JournalDto, JournalItemDto } from '@trading-cockpit/contracts';
import type { JournalEntry, JournalMetric } from '../../domain/journal-entry';
import type { PositionSnapshotValue } from '../../domain/position';
import type { JournalReader } from '../../ports/outbound/journal-reader';

export interface GetJournalDependencies {
  reader: JournalReader;
  now: () => Date;
}

function nullableText(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text || null;
}

function nullableNumber(value: PositionSnapshotValue | JournalMetric): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function serializedDate(value: PositionSnapshotValue): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  return nullableText(value);
}

function toItem(entry: JournalEntry): JournalItemDto {
  return {
    id: entry.id,
    positionId: entry.positionId,
    accountId: entry.accountId,
    tradePlanId: entry.tradePlanId,
    watchlistId: entry.watchlistId,
    strategyId: entry.strategyId,
    strategyName: entry.strategyName,
    strategyVersion: entry.strategyVersion,
    ticker: entry.ticker,
    openedAt: serializedDate(entry.openedAt),
    closedAt: serializedDate(entry.closedAt),
    plannedEntry: nullableNumber(entry.plannedEntry),
    actualEntry: nullableNumber(entry.actualEntry),
    exitPrice: nullableNumber(entry.exitPrice),
    quantity: nullableNumber(entry.quantity),
    initialStop: nullableNumber(entry.initialStop),
    target: nullableNumber(entry.target),
    plannedMaxRisk: nullableNumber(entry.plannedMaxRisk),
    plannedRiskReward: nullableNumber(entry.plannedRiskReward),
    realizedPnl: nullableNumber(entry.realizedPnl),
    returnPercent: nullableNumber(entry.returnPercent),
    rMultiple: nullableNumber(entry.rMultiple),
    outcome: entry.outcome,
    exitReason: nullableText(entry.exitReason),
    executionNotes: nullableText(entry.executionNotes),
    lessonsLearned: nullableText(entry.lessonsLearned),
    followedPlan: nullableText(entry.followedPlan)
  };
}

export function createGetJournal({ reader, now }: GetJournalDependencies): () => JournalDto {
  return () => ({
    generatedAt: now().toISOString(),
    items: reader.findAll().map(toItem)
  });
}
