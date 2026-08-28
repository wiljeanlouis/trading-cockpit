import { normalizeStrategyId, normalizeTicker, type WatchlistSnapshotValue } from './watchlist';
import type { TradePlan } from './trade-plan';

export type PositionSnapshotValue = WatchlistSnapshotValue;
export type PositionCalculationValue = number | null;
export type PositionRatioCalculationValue = PositionCalculationValue | 'DIVISION_BY_ZERO';

export const INITIAL_POSITION_STATUS = 'OPEN' as const;
export const EXECUTABLE_TRADE_PLAN_STATUSES = ['DRAFT', 'READY'] as const;
export const POSITION_STATUSES = ['OPEN', 'CLOSED', 'STOPPED', 'TARGET HIT'] as const;
export const CLOSED_POSITION_STATUS = 'CLOSED' as const;
export const TERMINAL_POSITION_STATUSES = ['CLOSED', 'STOPPED', 'TARGET HIT'] as const;

export interface NormalizedPositionSource {
  accountId: string;
  tradePlanId: string;
  watchlistId: string;
  strategyId: string;
  strategyName: string;
  strategyVersion: string;
  ticker: string;
  plannedEntry: PositionSnapshotValue;
  plannedStop: PositionSnapshotValue;
  plannedTarget: PositionSnapshotValue;
  plannedQuantity: PositionSnapshotValue;
  plannedMaxRisk: PositionSnapshotValue;
  plannedRiskReward: PositionSnapshotValue;
  tradePlanStatus: string;
}

export interface Position {
  id: string;
  accountId: string;
  tradePlanId: string;
  watchlistId: string;
  strategyId: string;
  strategyName: string;
  strategyVersion: string;
  ticker: string;
  openedAt: PositionSnapshotValue;
  plannedEntry: PositionSnapshotValue;
  actualEntry: PositionSnapshotValue;
  plannedQuantity: PositionSnapshotValue;
  actualQuantity: PositionSnapshotValue;
  initialStop: PositionSnapshotValue;
  currentStop: PositionSnapshotValue;
  target: PositionSnapshotValue;
  plannedMaxRisk: PositionSnapshotValue;
  plannedRiskReward: PositionSnapshotValue;
  currentPrice: PositionSnapshotValue;
  unrealizedPnl: PositionSnapshotValue;
  unrealizedPnlPercent: PositionSnapshotValue;
  status: string;
  closedAt: PositionSnapshotValue;
  exitPrice: PositionSnapshotValue;
  realizedPnl: PositionSnapshotValue;
  notes: string;
}

function isFiniteNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

export function calculateUnrealizedPnl(
  currentPrice: number | null,
  actualEntry: number | null,
  actualQuantity: number | null
): PositionCalculationValue {
  return isFiniteNumber(currentPrice) &&
    isFiniteNumber(actualEntry) &&
    isFiniteNumber(actualQuantity)
    ? (currentPrice - actualEntry) * actualQuantity
    : null;
}

export function calculateUnrealizedPnlPercent(
  currentPrice: number | null,
  actualEntry: number | null
): PositionRatioCalculationValue {
  if (!isFiniteNumber(currentPrice) || !isFiniteNumber(actualEntry)) {
    return null;
  }

  return actualEntry === 0 ? 'DIVISION_BY_ZERO' : currentPrice / actualEntry - 1;
}

export function isOpenPositionStatus(status: string): boolean {
  return (
    String(status || '')
      .trim()
      .toUpperCase() === INITIAL_POSITION_STATUS
  );
}

export function calculateRealizedPnl(
  exitPrice: number,
  actualEntry: number,
  actualQuantity: number
): number {
  return (exitPrice - actualEntry) * actualQuantity;
}

export function closePosition(position: Position, exitPrice: number, closedAt: Date): Position {
  if (!isOpenPositionStatus(position.status)) {
    throw new Error(`${position.ticker} n'est pas une position OPEN.`);
  }

  return {
    ...position,
    closedAt,
    exitPrice,
    realizedPnl: calculateRealizedPnl(
      exitPrice,
      Number(position.actualEntry),
      Number(position.actualQuantity)
    ),
    status: CLOSED_POSITION_STATUS
  };
}

export function normalizePositionSource(tradePlan: TradePlan): NormalizedPositionSource {
  const accountId = String(tradePlan.accountId || '')
    .trim()
    .toUpperCase();
  const tradePlanId = String(tradePlan.id || '').trim();
  const watchlistId = String(tradePlan.watchlistId || '').trim();
  const strategyId = normalizeStrategyId(tradePlan.strategyId);
  const strategyName = String(tradePlan.strategyName || '').trim();
  const strategyVersion = String(tradePlan.strategyVersion || '').trim();
  const ticker = normalizeTicker(tradePlan.ticker);

  if (!tradePlanId) {
    throw new Error('Trade Plan ID absent.');
  }
  if (!accountId) throw new Error('Account ID absent sur le Trade Plan.');

  if (!watchlistId) {
    throw new Error('Watchlist ID absent.');
  }

  if (!strategyId) {
    throw new Error('Strategy ID absent.');
  }

  if (!strategyName) {
    throw new Error('Strategy absente.');
  }

  if (!strategyVersion) {
    throw new Error('Strategy Version absente.');
  }

  if (!ticker) {
    throw new Error('Ticker absent.');
  }

  return {
    accountId,
    tradePlanId,
    watchlistId,
    strategyId,
    strategyName,
    strategyVersion,
    ticker,
    plannedEntry: tradePlan.entryPrice,
    plannedStop: tradePlan.stopPrice,
    plannedTarget: tradePlan.targetPrice,
    plannedQuantity: tradePlan.positionSize,
    plannedMaxRisk: tradePlan.maxRisk,
    plannedRiskReward: tradePlan.riskReward,
    tradePlanStatus: String(tradePlan.status || '')
      .trim()
      .toUpperCase()
  };
}

export function requireExecutableTradePlanStatus(source: NormalizedPositionSource): void {
  if (source.tradePlanStatus === 'EXECUTED') {
    throw new Error(`${source.ticker} est déjà marqué EXECUTED.`);
  }

  if (source.tradePlanStatus === 'CANCELLED') {
    throw new Error("Impossible d'exécuter un Trade Plan CANCELLED.");
  }

  if (!EXECUTABLE_TRADE_PLAN_STATUSES.some((status) => status === source.tradePlanStatus)) {
    throw new Error(
      `Le Trade Plan ${source.ticker} ne peut pas être exécuté ` +
        `avec le statut ${source.tradePlanStatus}.`
    );
  }
}

export function requirePositionExecutionData(source: NormalizedPositionSource): void {
  if (source.plannedEntry === '' || source.plannedEntry === null) {
    throw new Error(`${source.ticker} n'a pas d'Entry Price.`);
  }

  if (source.plannedStop === '' || source.plannedStop === null) {
    throw new Error(`${source.ticker} n'a pas de Stop Price.`);
  }

  if (
    source.plannedQuantity === '' ||
    source.plannedQuantity === null ||
    Number(source.plannedQuantity) <= 0
  ) {
    throw new Error(`${source.ticker} n'a pas de Position Size valide.`);
  }
}

export function createOpenPosition(
  source: NormalizedPositionSource,
  id: string,
  openedAt: Date
): Position {
  return {
    id,
    accountId: source.accountId,
    tradePlanId: source.tradePlanId,
    watchlistId: source.watchlistId,
    strategyId: source.strategyId,
    strategyName: source.strategyName,
    strategyVersion: source.strategyVersion,
    ticker: source.ticker,
    openedAt,
    plannedEntry: source.plannedEntry,
    actualEntry: Number(source.plannedEntry),
    plannedQuantity: source.plannedQuantity,
    actualQuantity: Number(source.plannedQuantity),
    initialStop: source.plannedStop,
    currentStop: source.plannedStop,
    target: source.plannedTarget,
    plannedMaxRisk: source.plannedMaxRisk,
    plannedRiskReward: source.plannedRiskReward,
    currentPrice: '',
    unrealizedPnl: '',
    unrealizedPnlPercent: '',
    status: INITIAL_POSITION_STATUS,
    closedAt: '',
    exitPrice: '',
    realizedPnl: '',
    notes: ''
  };
}
