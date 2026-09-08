import {
  createTradePlan,
  normalizeTradePlanSource,
  requireTradePlanInvalidationLevel,
  type TradePlan
} from '../../domain/trade-plan';
import type { RuntimePort } from '../../ports/outbound/runtime-port';
import type { StrategyRepository } from '../../ports/outbound/strategy-repository';
import type { TradePlanRepository } from '../../ports/outbound/trade-plan-repository';
import type { TradingAccountRepository } from '../../ports/outbound/trading-account-repository';
import type { TradingAccountRiskPolicyRepository } from '../../ports/outbound/trading-account-risk-policy-repository';
import type { WatchlistRepository } from '../../ports/outbound/watchlist-repository';
import type { GetAccountEquity } from '../trading-account/get-account-equity';

export interface CreateTradePlanFromWatchlistCommand {
  watchlistId: string;
  accountId: string;
  triggerLevel?: number | null;
  invalidationLevel?: number | null;
  eventRisk?: string | null;
}

export type CreateTradePlanFromWatchlistResult =
  | {
      kind: 'created';
      tradePlan: TradePlan;
    }
  | {
      kind: 'duplicate';
      watchlistId: string;
      ticker: string;
      existing: TradePlan;
    };

export interface CreateTradePlanFromWatchlistDependencies {
  watchlistRepository: WatchlistRepository;
  tradePlanRepository: TradePlanRepository;
  strategyRepository: StrategyRepository;
  tradingAccountRepository: TradingAccountRepository;
  tradingAccountRiskPolicyRepository: TradingAccountRiskPolicyRepository;
  getAccountEquity: GetAccountEquity;
  runtime: RuntimePort;
}

export type CreateTradePlanFromWatchlist = (
  command: CreateTradePlanFromWatchlistCommand
) => CreateTradePlanFromWatchlistResult;

/**
 * Accepts omitted planning levels while rejecting non-positive user-entered prices before the
 * domain calculates risk/reward and readiness.
 */
function optionalPositiveLevel(value: number | null, label: string): number | null {
  if (value === null) return null;
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} doit être supérieur à 0.`);
  }
  return value;
}

function requiredPositiveLevel(value: number | null, label: string): number {
  const normalized = optionalPositiveLevel(value, label);
  if (normalized === null) throw new Error(`${label} est requis.`);
  return normalized;
}

/**
 * Creates an account-aware Trade Plan from a Watchlist candidate using backend-owned account
 * equity/risk policy. React may provide planning inputs, but sizing and workflow state stay in
 * the domain.
 */
export function createCreateTradePlanFromWatchlist({
  watchlistRepository,
  tradePlanRepository,
  strategyRepository,
  tradingAccountRepository,
  tradingAccountRiskPolicyRepository,
  getAccountEquity,
  runtime
}: CreateTradePlanFromWatchlistDependencies): CreateTradePlanFromWatchlist {
  return ({ watchlistId, accountId, triggerLevel, invalidationLevel, eventRisk }) => {
    const normalizedWatchlistId = String(watchlistId || '').trim();
    const normalizedAccountId = String(accountId || '')
      .trim()
      .toUpperCase();

    if (!normalizedWatchlistId) {
      throw new Error('Watchlist ID absent.');
    }
    if (!normalizedAccountId) throw new Error('Account ID absent.');
    if (!tradingAccountRepository.findById(normalizedAccountId)) {
      throw new Error(`Trading Account introuvable : ${normalizedAccountId}`);
    }

    const watchlistEntry = watchlistRepository.findById(normalizedWatchlistId);

    if (!watchlistEntry) {
      throw new Error(`Watchlist ID introuvable : ${normalizedWatchlistId}`);
    }

    const hasWebPlanningInputs =
      triggerLevel !== undefined || invalidationLevel !== undefined || eventRisk !== undefined;
    const normalizedTriggerLevel =
      triggerLevel === undefined
        ? watchlistEntry.triggerLevel
        : (optionalPositiveLevel(triggerLevel, 'Trigger Level') ?? '');
    const normalizedInvalidationLevel =
      invalidationLevel === undefined
        ? watchlistEntry.invalidationLevel
        : requiredPositiveLevel(invalidationLevel, 'Invalidation Level');
    const normalizedEventRisk =
      eventRisk === undefined
        ? watchlistEntry.eventRisk
        : String(eventRisk ?? '')
            .trim()
            .toUpperCase();
    const duplicateTicker = String(watchlistEntry.ticker || '').trim();
    const source = normalizeTradePlanSource({
      ...watchlistEntry,
      triggerLevel: normalizedTriggerLevel,
      invalidationLevel: normalizedInvalidationLevel,
      eventRisk: normalizedEventRisk
    });

    if (!strategyRepository.existsById(source.strategyId)) {
      throw new Error(`Stratégie inconnue : ${source.strategyId}`);
    }
    if (
      strategyRepository.existsVersion &&
      !strategyRepository.existsVersion(source.strategyId, source.strategyVersion)
    ) {
      throw new Error(
        `Version de stratégie inconnue : ${source.strategyId} ${source.strategyVersion}`
      );
    }

    requireTradePlanInvalidationLevel(source);

    const existing = tradePlanRepository.findActiveByWatchlistIdAndAccountId(
      source.watchlistId,
      normalizedAccountId
    );

    if (existing) {
      return {
        kind: 'duplicate',
        watchlistId: source.watchlistId,
        ticker: duplicateTicker,
        existing
      };
    }

    const equity = getAccountEquity(normalizedAccountId);
    const riskPolicy = tradingAccountRiskPolicyRepository.findByAccountId(normalizedAccountId);
    if (!riskPolicy) throw new Error(`Risk % absent pour le compte ${normalizedAccountId}.`);
    const configuration = {
      accountEquity: equity.realizedEquity,
      riskPercent: riskPolicy.riskPercentPerTrade
    };
    const id = runtime.newId();
    const createdAt = runtime.now();
    const tradePlan = createTradePlan(source, configuration, normalizedAccountId, id, createdAt);

    tradePlanRepository.save(tradePlan);
    if (hasWebPlanningInputs) {
      watchlistRepository.updateTradePlanningInputs(source.watchlistId, {
        triggerLevel: typeof normalizedTriggerLevel === 'number' ? normalizedTriggerLevel : null,
        invalidationLevel: Number(normalizedInvalidationLevel),
        eventRisk: normalizedEventRisk
      });
    }
    watchlistRepository.updateStatus(source.watchlistId, 'PLANNED');

    return {
      kind: 'created',
      tradePlan
    };
  };
}
