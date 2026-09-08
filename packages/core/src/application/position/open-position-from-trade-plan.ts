import {
  createOpenPosition,
  normalizePositionSource,
  requireExecutableTradePlanStatus,
  requirePositionExecutionData,
  type Position
} from '../../domain/position';
import { evaluateExecutionEligibility } from '../../domain/trade-plan';
import type { PositionRepository } from '../../ports/outbound/position-repository';
import type { RuntimePort } from '../../ports/outbound/runtime-port';
import type { StrategyRepository } from '../../ports/outbound/strategy-repository';
import type { TradePlanRepository } from '../../ports/outbound/trade-plan-repository';
import type { WatchlistRepository } from '../../ports/outbound/watchlist-repository';

export interface OpenPositionFromTradePlanCommand {
  tradePlanId: string;
}

export type OpenPositionFromTradePlanResult =
  | {
      kind: 'opened';
      position: Position;
    }
  | {
      kind: 'duplicate';
      tradePlanId: string;
      ticker: string;
      existing: Position;
    };

export interface OpenPositionFromTradePlanDependencies {
  positionRepository: PositionRepository;
  tradePlanRepository: TradePlanRepository;
  watchlistRepository: WatchlistRepository;
  strategyRepository: StrategyRepository;
  runtime: RuntimePort;
}

export type OpenPositionFromTradePlan = (
  command: OpenPositionFromTradePlanCommand
) => OpenPositionFromTradePlanResult;

/**
 * Executes an eligible Trade Plan into exactly one open Position, then advances the related Trade
 * Plan and Watchlist statuses through the established workflow.
 */
export function createOpenPositionFromTradePlan({
  positionRepository,
  tradePlanRepository,
  watchlistRepository,
  strategyRepository,
  runtime
}: OpenPositionFromTradePlanDependencies): OpenPositionFromTradePlan {
  return ({ tradePlanId }) => {
    const normalizedTradePlanId = String(tradePlanId || '').trim();

    if (!normalizedTradePlanId) {
      throw new Error('Trade Plan ID absent.');
    }
    const tradePlan = tradePlanRepository.findById(normalizedTradePlanId);

    if (!tradePlan) {
      throw new Error(`Trade Plan ID introuvable : ${normalizedTradePlanId}`);
    }

    const source = normalizePositionSource(tradePlan);

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

    requireExecutableTradePlanStatus(source);
    const admission = evaluateExecutionEligibility(tradePlan);
    if (!admission.eligible) {
      throw new Error(admission.message ?? `Le Trade Plan ${source.ticker} n'est pas exécutable.`);
    }
    requirePositionExecutionData(source);

    const existing = positionRepository.findOpenByTradePlanId(source.tradePlanId);

    if (existing) {
      return {
        kind: 'duplicate',
        tradePlanId: source.tradePlanId,
        ticker: source.ticker,
        existing
      };
    }

    const openedAt = runtime.now();
    const id = runtime.newId();
    const position = createOpenPosition(source, id, openedAt);

    positionRepository.save(position);
    tradePlanRepository.updateStatus(source.tradePlanId, 'EXECUTED');
    watchlistRepository.updateStatus(source.watchlistId, 'ENTERED');

    return {
      kind: 'opened',
      position
    };
  };
}
