import {
  normalizeStrategyId,
  normalizeTicker,
  type WatchlistEntry,
  type WatchlistSnapshotValue
} from './watchlist';

export type TradePlanSnapshotValue = WatchlistSnapshotValue;
export type TradePlanCalculationValue = number | null;

export const INITIAL_TRADE_PLAN_STATUS = 'DRAFT' as const;
export const INITIAL_TRADE_PLAN_ENTRY_TYPE = 'BREAKOUT' as const;
export const ACTIVE_TRADE_PLAN_STATUSES = ['DRAFT', 'READY'] as const;

export interface TradingRiskConfiguration {
  accountEquity: number;
  riskPercent: number;
}

export interface TradePlanPlanningInputs {
  entryPrice: number;
  stopPrice: number;
  targetPrice: number | null;
  positionSize: number | null;
}

export interface NormalizedTradePlanSource {
  watchlistId: string;
  strategyId: string;
  strategyName: string;
  strategyVersion: string;
  signalDate: TradePlanSnapshotValue;
  signalPrice: TradePlanSnapshotValue;
  ticker: string;
  referencePrice: TradePlanSnapshotValue;
  momentumScore: TradePlanSnapshotValue;
  setupStatus: string;
  breakoutLevel: TradePlanSnapshotValue;
  invalidationLevel: TradePlanSnapshotValue;
  eventRisk: string;
}

export interface TradePlan {
  id: string;
  accountId: string;
  watchlistId: string;
  strategyId: string;
  strategyName: string;
  strategyVersion: string;
  signalDate: TradePlanSnapshotValue;
  signalPrice: TradePlanSnapshotValue;
  ticker: string;
  referencePrice: TradePlanSnapshotValue;
  momentumScore: TradePlanSnapshotValue;
  setupStatus: string;
  breakoutLevel: TradePlanSnapshotValue;
  invalidationLevel: TradePlanSnapshotValue;
  eventRisk: string;
  createdAt: TradePlanSnapshotValue;
  entryType: string;
  entryPrice: TradePlanSnapshotValue;
  stopPrice: TradePlanSnapshotValue;
  targetPrice: TradePlanSnapshotValue;
  riskPerShare: TradePlanSnapshotValue;
  rewardPerShare: TradePlanSnapshotValue;
  riskReward: TradePlanSnapshotValue;
  accountEquity: number;
  riskPercent: number;
  maxRisk: TradePlanSnapshotValue;
  positionSize: TradePlanSnapshotValue;
  positionValue: TradePlanSnapshotValue;
  status: string;
  notes: string;
}

function isFiniteNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

export function calculateRiskPerShare(
  entryPrice: number | null,
  stopPrice: number | null
): TradePlanCalculationValue {
  return isFiniteNumber(entryPrice) && isFiniteNumber(stopPrice) ? entryPrice - stopPrice : null;
}

export function calculateRewardPerShare(
  entryPrice: number | null,
  targetPrice: number | null
): TradePlanCalculationValue {
  return isFiniteNumber(entryPrice) && isFiniteNumber(targetPrice)
    ? targetPrice - entryPrice
    : null;
}

export function calculateRiskReward(
  riskPerShare: number | null,
  rewardPerShare: number | null
): TradePlanCalculationValue {
  return isFiniteNumber(riskPerShare) && riskPerShare > 0 && isFiniteNumber(rewardPerShare)
    ? rewardPerShare / riskPerShare
    : null;
}

export function calculateMaxRisk(
  accountEquity: number | null,
  riskPercent: number | null
): TradePlanCalculationValue {
  return isFiniteNumber(accountEquity) && isFiniteNumber(riskPercent)
    ? accountEquity * riskPercent
    : null;
}

export function calculatePlannedQuantity(
  maxRisk: number | null,
  riskPerShare: number | null
): TradePlanCalculationValue {
  return isFiniteNumber(maxRisk) && isFiniteNumber(riskPerShare) && riskPerShare > 0
    ? Math.floor(maxRisk / riskPerShare)
    : null;
}

export function calculatePositionValue(
  quantity: number | null,
  entryPrice: number | null
): TradePlanCalculationValue {
  return isFiniteNumber(quantity) && isFiniteNumber(entryPrice) ? quantity * entryPrice : null;
}

export function isActiveTradePlanStatus(status: string): boolean {
  const normalizedStatus = String(status || '')
    .trim()
    .toUpperCase();

  return ACTIVE_TRADE_PLAN_STATUSES.some((activeStatus) => activeStatus === normalizedStatus);
}

export function normalizeTradePlanSource(source: WatchlistEntry): NormalizedTradePlanSource {
  const watchlistId = String(source.id || '').trim();
  const strategyId = normalizeStrategyId(source.strategyId);
  const strategyName = String(source.strategyName || '').trim();
  const strategyVersion = String(source.strategyVersion || '').trim();
  const ticker = normalizeTicker(source.ticker);

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

  if (!source.ticker) {
    throw new Error('Ticker absent.');
  }

  return {
    watchlistId,
    strategyId,
    strategyName,
    strategyVersion,
    signalDate: source.signalDate,
    signalPrice: source.signalPrice,
    ticker,
    referencePrice: source.currentPrice,
    momentumScore: source.momentumScore,
    setupStatus: source.setupStatus,
    breakoutLevel: source.breakoutLevel,
    invalidationLevel: source.invalidationLevel,
    eventRisk: source.eventRisk
  };
}

export function requireTradePlanInvalidationLevel(source: NormalizedTradePlanSource): void {
  if (source.invalidationLevel === '' || source.invalidationLevel === null) {
    throw new Error(
      `${source.ticker} n'a pas encore d'Invalidation Level. ` +
        `Définis-le avant de créer un Trade Plan.`
    );
  }
}

export function validateTradingRiskConfiguration(config: TradingRiskConfiguration): void {
  if (!Number.isFinite(config.accountEquity) || config.accountEquity <= 0) {
    throw new Error('Account Equity doit être supérieur à 0.');
  }

  if (!Number.isFinite(config.riskPercent) || config.riskPercent <= 0 || config.riskPercent > 1) {
    throw new Error('Default Risk % doit être compris entre 0% et 100%.');
  }
}

export function createTradePlan(
  source: NormalizedTradePlanSource,
  configuration: TradingRiskConfiguration,
  accountId: string,
  id: string,
  createdAt: Date
): TradePlan {
  const normalizedAccountId = String(accountId || '')
    .trim()
    .toUpperCase();
  if (!normalizedAccountId) throw new Error('Account ID absent.');
  validateTradingRiskConfiguration(configuration);

  return {
    id,
    accountId: normalizedAccountId,
    watchlistId: source.watchlistId,
    strategyId: source.strategyId,
    strategyName: source.strategyName,
    strategyVersion: source.strategyVersion,
    signalDate: source.signalDate,
    signalPrice: source.signalPrice,
    ticker: source.ticker,
    referencePrice: source.referencePrice,
    momentumScore: source.momentumScore,
    setupStatus: source.setupStatus,
    breakoutLevel: source.breakoutLevel,
    invalidationLevel: source.invalidationLevel,
    eventRisk: source.eventRisk,
    createdAt,
    entryType: INITIAL_TRADE_PLAN_ENTRY_TYPE,
    entryPrice: '',
    stopPrice: source.invalidationLevel,
    targetPrice: '',
    riskPerShare: null,
    rewardPerShare: null,
    riskReward: null,
    accountEquity: configuration.accountEquity,
    riskPercent: configuration.riskPercent,
    maxRisk: calculateMaxRisk(configuration.accountEquity, configuration.riskPercent),
    positionSize: null,
    positionValue: null,
    status: INITIAL_TRADE_PLAN_STATUS,
    notes: ''
  };
}

export function updateTradePlanPlanning(
  tradePlan: TradePlan,
  inputs: TradePlanPlanningInputs
): TradePlan {
  if (!isActiveTradePlanStatus(tradePlan.status)) {
    throw new Error(`Le Trade Plan ${tradePlan.ticker} n'est plus modifiable.`);
  }
  if (!Number.isFinite(inputs.entryPrice) || inputs.entryPrice <= 0) {
    throw new Error('Planned Entry doit être supérieur à 0.');
  }
  if (!Number.isFinite(inputs.stopPrice) || inputs.stopPrice <= 0) {
    throw new Error('Stop Price doit être supérieur à 0.');
  }
  if (
    inputs.targetPrice !== null &&
    (!Number.isFinite(inputs.targetPrice) || inputs.targetPrice <= 0)
  ) {
    throw new Error('Target Price doit être supérieur à 0 lorsqu’il est renseigné.');
  }
  if (
    inputs.positionSize !== null &&
    (!Number.isFinite(inputs.positionSize) ||
      inputs.positionSize <= 0 ||
      !Number.isInteger(inputs.positionSize))
  ) {
    throw new Error(
      'Position Size doit être un nombre entier supérieur à 0 lorsqu’il est renseigné.'
    );
  }

  const riskPerShare = calculateRiskPerShare(inputs.entryPrice, inputs.stopPrice);
  if (riskPerShare === null || riskPerShare <= 0) {
    throw new Error('Planned Entry doit être supérieur au Stop Price.');
  }
  const rewardPerShare = calculateRewardPerShare(inputs.entryPrice, inputs.targetPrice);
  const riskReward = calculateRiskReward(riskPerShare, rewardPerShare);
  const maxRisk = calculateMaxRisk(tradePlan.accountEquity, tradePlan.riskPercent);
  if (
    inputs.positionSize !== null &&
    maxRisk !== null &&
    inputs.positionSize * riskPerShare > maxRisk
  ) {
    throw new Error(
      `Position Size dépasse le risque maximum autorisé de ${maxRisk.toFixed(2)} pour ce Trade Plan.`
    );
  }
  const positionSize = inputs.positionSize ?? calculatePlannedQuantity(maxRisk, riskPerShare);
  const positionValue = calculatePositionValue(positionSize, inputs.entryPrice);

  return {
    ...tradePlan,
    entryPrice: inputs.entryPrice,
    stopPrice: inputs.stopPrice,
    targetPrice: inputs.targetPrice ?? '',
    riskPerShare,
    rewardPerShare,
    riskReward,
    maxRisk,
    positionSize,
    positionValue
  };
}
