import {
  createTradePlan,
  normalizeTradePlanSource,
  requireTradePlanInvalidationLevel,
  type TradePlan
} from '../../domain/trade-plan';
import type { RuntimePort } from '../../../ports/outbound/runtime-port';
import type { StrategyRepository } from '../../../ports/outbound/strategy-repository';
import type { TradePlanRepository } from '../../../ports/outbound/trade-plan-repository';
import type { TradingConfigurationPort } from '../../../ports/outbound/trading-configuration-port';
import type { WatchlistRepository } from '../../../ports/outbound/watchlist-repository';

export interface CreateTradePlanFromWatchlistCommand {
  watchlistId: string;
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
  tradingConfiguration: TradingConfigurationPort;
  runtime: RuntimePort;
}

export type CreateTradePlanFromWatchlist = (
  command: CreateTradePlanFromWatchlistCommand
) => CreateTradePlanFromWatchlistResult;

export function createCreateTradePlanFromWatchlist({
  watchlistRepository,
  tradePlanRepository,
  strategyRepository,
  tradingConfiguration,
  runtime
}: CreateTradePlanFromWatchlistDependencies): CreateTradePlanFromWatchlist {
  return ({ watchlistId }) => {
    const normalizedWatchlistId = String(watchlistId || '').trim();

    if (!normalizedWatchlistId) {
      throw new Error('Watchlist ID absent.');
    }

    const watchlistEntry = watchlistRepository.findById(normalizedWatchlistId);

    if (!watchlistEntry) {
      throw new Error(`Watchlist ID introuvable : ${normalizedWatchlistId}`);
    }

    const duplicateTicker = String(watchlistEntry.ticker || '').trim();
    const source = normalizeTradePlanSource(watchlistEntry);

    if (!strategyRepository.existsById(source.strategyId)) {
      throw new Error(`Stratégie inconnue : ${source.strategyId}`);
    }

    requireTradePlanInvalidationLevel(source);

    const existing = tradePlanRepository.findActiveByWatchlistId(source.watchlistId);

    if (existing) {
      return {
        kind: 'duplicate',
        watchlistId: source.watchlistId,
        ticker: duplicateTicker,
        existing
      };
    }

    // Preserve the legacy order: UUID, timestamp, then configuration.
    const id = runtime.newId();
    const createdAt = runtime.now();
    const configuration = tradingConfiguration.getRiskConfiguration();
    const tradePlan = createTradePlan(source, configuration, id, createdAt);

    tradePlanRepository.save(tradePlan);
    watchlistRepository.updateStatus(source.watchlistId, 'PLANNED');

    return {
      kind: 'created',
      tradePlan
    };
  };
}
