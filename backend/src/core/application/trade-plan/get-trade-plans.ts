import type { TradePlanItemDto, TradePlansDto } from '@trading-cockpit/contracts';
import type { TradePlanSnapshotValue } from '../../domain/trade-plan';
import type { TradePlanReader } from '../../../ports/outbound/trade-plan-reader';
import type { StrategyRepository } from '../../../ports/outbound/strategy-repository';
import {
  normalizePositionSource,
  requireExecutableTradePlanStatus,
  requirePositionExecutionData
} from '../../domain/position';

export interface GetTradePlansDependencies {
  reader: TradePlanReader;
  strategyRepository: StrategyRepository;
  now: () => Date;
}

function nullableText(value: TradePlanSnapshotValue): string | null {
  const text = String(value ?? '').trim();
  return text || null;
}

function nullableNumber(value: TradePlanSnapshotValue): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function serializedDate(value: TradePlanSnapshotValue): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return nullableText(value);
}

function executionEligibility(
  plan: ReturnType<TradePlanReader['findAll']>[number],
  strategyRepository: StrategyRepository
): TradePlanItemDto['executionEligibility'] {
  try {
    const source = normalizePositionSource(plan);
    if (!strategyRepository.existsById(source.strategyId)) {
      throw new Error(`Stratégie inconnue : ${source.strategyId}`);
    }
    requireExecutableTradePlanStatus(source);
    requirePositionExecutionData(source);
    return { eligible: true, reason: null };
  } catch (error) {
    return { eligible: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

function toItem(
  plan: ReturnType<TradePlanReader['findAll']>[number],
  strategyRepository: StrategyRepository
): TradePlanItemDto {
  return {
    id: plan.id,
    watchlistId: plan.watchlistId,
    accountId: plan.accountId,
    ticker: plan.ticker,
    strategyId: plan.strategyId,
    strategyName: plan.strategyName,
    strategyVersion: plan.strategyVersion,
    signalDate: serializedDate(plan.signalDate),
    signalPrice: nullableNumber(plan.signalPrice),
    referencePrice: nullableNumber(plan.referencePrice),
    momentumScore: nullableNumber(plan.momentumScore),
    setupStatus: nullableText(plan.setupStatus),
    breakoutLevel: nullableNumber(plan.breakoutLevel),
    invalidationLevel: nullableNumber(plan.invalidationLevel),
    eventRisk: nullableText(plan.eventRisk),
    createdAt: serializedDate(plan.createdAt),
    entryType: nullableText(plan.entryType),
    entryPrice: nullableNumber(plan.entryPrice),
    stopPrice: nullableNumber(plan.stopPrice),
    targetPrice: nullableNumber(plan.targetPrice),
    riskPerShare: nullableNumber(plan.riskPerShare),
    rewardPerShare: nullableNumber(plan.rewardPerShare),
    riskReward: nullableNumber(plan.riskReward),
    accountEquity:
      Number.isFinite(plan.accountEquity) && plan.accountEquity > 0 ? plan.accountEquity : null,
    riskPercent:
      Number.isFinite(plan.riskPercent) && plan.riskPercent > 0 ? plan.riskPercent : null,
    maxRisk: nullableNumber(plan.maxRisk),
    positionSize: nullableNumber(plan.positionSize),
    positionValue: nullableNumber(plan.positionValue),
    status: plan.status,
    notes: nullableText(plan.notes),
    executionEligibility: executionEligibility(plan, strategyRepository)
  };
}

export function createGetTradePlans({
  reader,
  strategyRepository,
  now
}: GetTradePlansDependencies): () => TradePlansDto {
  return () => ({
    generatedAt: now().toISOString(),
    items: reader.findAll().map((plan) => toItem(plan, strategyRepository))
  });
}
