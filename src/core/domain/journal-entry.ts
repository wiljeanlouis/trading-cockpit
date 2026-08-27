import type { Position, PositionSnapshotValue } from './position';

export type JournalMetric = number | null | 'DIVISION_BY_ZERO';
export type JournalOutcome = 'WIN' | 'LOSS' | 'BREAKEVEN' | null;

export interface JournalEntry {
  id: string;
  positionId: string;
  tradePlanId: string;
  watchlistId: string;
  strategyId: string;
  strategyName: string;
  strategyVersion: string;
  ticker: string;
  openedAt: PositionSnapshotValue;
  closedAt: PositionSnapshotValue;
  plannedEntry: PositionSnapshotValue;
  actualEntry: PositionSnapshotValue;
  exitPrice: PositionSnapshotValue;
  quantity: PositionSnapshotValue;
  initialStop: PositionSnapshotValue;
  target: PositionSnapshotValue;
  plannedMaxRisk: PositionSnapshotValue;
  plannedRiskReward: PositionSnapshotValue;
  realizedPnl: PositionSnapshotValue;
  returnPercent: JournalMetric;
  rMultiple: JournalMetric;
  outcome: JournalOutcome;
  exitReason: string;
  executionNotes: string;
  lessonsLearned: string;
  followedPlan: string;
}

export function calculateJournalReturn(exitPrice: unknown, actualEntry: unknown): JournalMetric {
  if (exitPrice === '' || exitPrice === null || actualEntry === '' || actualEntry === null) {
    return null;
  }

  const entry = Number(actualEntry);
  return entry === 0 ? 'DIVISION_BY_ZERO' : Number(exitPrice) / entry - 1;
}

export function calculateRMultiple(realizedPnl: unknown, plannedMaxRisk: unknown): JournalMetric {
  if (
    realizedPnl === '' ||
    realizedPnl === null ||
    plannedMaxRisk === '' ||
    plannedMaxRisk === null ||
    Number(plannedMaxRisk) <= 0
  ) {
    return null;
  }

  return Number(realizedPnl) / Number(plannedMaxRisk);
}

export function calculateOutcome(realizedPnl: unknown): JournalOutcome {
  if (realizedPnl === '' || realizedPnl === null) {
    return null;
  }

  const pnl = Number(realizedPnl);
  return pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BREAKEVEN';
}

export function createJournalEntryFromClosedPosition(position: Position, id: string): JournalEntry {
  return {
    id,
    positionId: position.id,
    tradePlanId: position.tradePlanId,
    watchlistId: position.watchlistId,
    strategyId: position.strategyId,
    strategyName: position.strategyName,
    strategyVersion: position.strategyVersion,
    ticker: position.ticker,
    openedAt: position.openedAt,
    closedAt: position.closedAt,
    plannedEntry: position.plannedEntry,
    actualEntry: position.actualEntry,
    exitPrice: position.exitPrice,
    quantity: position.actualQuantity,
    initialStop: position.initialStop,
    target: position.target,
    plannedMaxRisk: position.plannedMaxRisk,
    plannedRiskReward: position.plannedRiskReward,
    realizedPnl: position.realizedPnl,
    returnPercent: calculateJournalReturn(position.exitPrice, position.actualEntry),
    rMultiple: calculateRMultiple(position.realizedPnl, position.plannedMaxRisk),
    outcome: calculateOutcome(position.realizedPnl),
    exitReason: '',
    executionNotes: '',
    lessonsLearned: '',
    followedPlan: ''
  };
}
