import type { TradePlanItemDto, TradePlansDto } from '@trading-cockpit/contracts';
import type { TradePlanSnapshotValue } from '../../domain/trade-plan';
import type { TradePlanReader } from '../../../ports/outbound/trade-plan-reader';
import {
  normalizePositionSource,
  requireExecutableTradePlanStatus,
  requirePositionExecutionData
} from '../../domain/position';

export interface GetTradePlansDependencies {
  reader: TradePlanReader;
  strategyIds: () => readonly string[];
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
  configuredStrategyIds: ReadonlySet<string>,
  strategyCatalogError: Error | null
): TradePlanItemDto['executionEligibility'] {
  try {
    if (strategyCatalogError) throw strategyCatalogError;
    const source = normalizePositionSource(plan);
    if (!configuredStrategyIds.has(source.strategyId.trim().toUpperCase())) {
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
  configuredStrategyIds: ReadonlySet<string>,
  strategyCatalogError: Error | null
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
    executionEligibility: executionEligibility(plan, configuredStrategyIds, strategyCatalogError)
  };
}

export function createGetTradePlans({
  reader,
  strategyIds,
  now
}: GetTradePlansDependencies): () => TradePlansDto {
  return () => {
    const plans = reader.findAll();
    let strategyCatalogError: Error | null = null;
    let configuredStrategyIds = new Set<string>();

    if (plans.length > 0) {
      try {
        configuredStrategyIds = new Set(
          strategyIds().map((strategyId) =>
            String(strategyId || '')
              .trim()
              .toUpperCase()
          )
        );
      } catch (error) {
        strategyCatalogError = error instanceof Error ? error : new Error(String(error));
      }
    }

    return {
      generatedAt: now().toISOString(),
      items: plans.map((plan) => toItem(plan, configuredStrategyIds, strategyCatalogError))
    };
  };
}
