import { validateMarketSignalFeed, type MarketSignalBatch } from '../../domain/market-signal';
import type { MarketSignalProjection } from '../../ports/outbound/market-signal-projection';
import type { MarketSignalSource } from '../../ports/outbound/market-signal-source';
import type { TradingStrategyCatalog } from '../../ports/outbound/trading-strategy-catalog';

export interface RefreshMarketSignalsDependencies {
  source: MarketSignalSource;
  strategyCatalog: TradingStrategyCatalog;
  projection: MarketSignalProjection;
  archiveSignals: (batch: MarketSignalBatch) => number;
  now: () => Date;
  observe?: (event: string, fields: Record<string, unknown>) => void;
}

export interface RefreshMarketSignalsRequest {
  strategyId?: string | null;
}

export interface RefreshedMarketSignalsFeed {
  strategyId: string;
  strategyVersion: string;
  signalCount: number;
  archived: number;
}

export interface RefreshMarketSignalsResult {
  archived: number;
  refreshed: RefreshedMarketSignalsFeed[];
}

/**
 * Orchestrates a provider-neutral market-signal refresh.
 *
 * The use case validates strategy/version consistency, writes the latest projection and
 * archives new observations. Provider transport, credentials and rate limiting stay behind
 * MarketSignalSource.
 */
export function createRefreshMarketSignals(
  dependencies: RefreshMarketSignalsDependencies
): (request?: RefreshMarketSignalsRequest) => RefreshMarketSignalsResult {
  return (request = {}) => {
    const requestedStrategyId = normalizeStrategyId(request.strategyId);
    let totalNewSignals = 0;
    const refreshed: RefreshedMarketSignalsFeed[] = [];
    const feeds = dependencies.source
      .listFeeds()
      .filter(
        (feed) =>
          !requestedStrategyId || normalizeStrategyId(feed.strategyId) === requestedStrategyId
      );
    if (requestedStrategyId && feeds.length === 0) {
      throw new Error(`Aucun feed actif configuré pour ${requestedStrategyId}.`);
    }
    for (const feed of feeds) {
      validateMarketSignalFeed(feed);
      const strategy = dependencies.strategyCatalog.getById(feed.strategyId);
      dependencies.observe?.('STRATEGY_LOADED', {
        strategyId: strategy.id,
        strategyVersion: strategy.version,
        enabled: strategy.enabled
      });
      if (!strategy.enabled) throw new Error(`La stratégie ${feed.strategyId} est désactivée.`);
      if (String(feed.strategyVersion).trim() !== String(strategy.version).trim()) {
        throw new Error(
          `Version incohérente pour ${feed.strategyId}. Screener=${feed.strategyVersion}, Strategies=${strategy.version}.`
        );
      }
      const batch = dependencies.source.fetchSignals(feed.id);
      dependencies.observe?.('SOURCE_RESPONSE', {
        signals: batch.signals.length,
        attributes: batch.attributeNames.length
      });
      if (batch.signals.length === 0) {
        dependencies.observe?.('VALID_EMPTY_RESULT', { feedId: feed.id });
      }
      dependencies.projection.replace(batch, dependencies.now());
      dependencies.observe?.('PROJECTION_WRITTEN', { rows: batch.signals.length });
      const archived = dependencies.archiveSignals(batch);
      dependencies.observe?.('HISTORY_ARCHIVED', { count: archived });
      totalNewSignals += archived;
      refreshed.push({
        strategyId: feed.strategyId,
        strategyVersion: feed.strategyVersion,
        signalCount: batch.signals.length,
        archived
      });
    }
    return { archived: totalNewSignals, refreshed };
  };
}

function normalizeStrategyId(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}
