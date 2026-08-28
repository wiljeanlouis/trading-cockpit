import { validateMarketSignalFeed, type MarketSignalBatch } from '../../domain/market-signal';
import type { MarketSignalProjection } from '../../../ports/outbound/market-signal-projection';
import type { MarketSignalSource } from '../../../ports/outbound/market-signal-source';
import type { TradingStrategyCatalog } from '../../../ports/outbound/trading-strategy-catalog';

export interface RefreshMarketSignalsDependencies {
  source: MarketSignalSource;
  strategyCatalog: TradingStrategyCatalog;
  projection: MarketSignalProjection;
  archiveSignals: (batch: MarketSignalBatch) => number;
  now: () => Date;
}

export function createRefreshMarketSignals(
  dependencies: RefreshMarketSignalsDependencies
): () => number {
  return () => {
    let totalNewSignals = 0;
    for (const feed of dependencies.source.listFeeds()) {
      validateMarketSignalFeed(feed);
      const strategy = dependencies.strategyCatalog.getById(feed.strategyId);
      if (!strategy.enabled) throw new Error(`La stratégie ${feed.strategyId} est désactivée.`);
      if (String(feed.strategyVersion).trim() !== String(strategy.version).trim()) {
        throw new Error(
          `Version incohérente pour ${feed.strategyId}. Screener=${feed.strategyVersion}, Strategies=${strategy.version}.`
        );
      }
      const batch = dependencies.source.fetchSignals(feed.id);
      dependencies.projection.replace(batch, dependencies.now());
      totalNewSignals += dependencies.archiveSignals(batch);
    }
    return totalNewSignals;
  };
}
