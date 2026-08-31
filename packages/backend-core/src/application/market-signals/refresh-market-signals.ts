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

export function createRefreshMarketSignals(
  dependencies: RefreshMarketSignalsDependencies
): () => number {
  return () => {
    let totalNewSignals = 0;
    for (const feed of dependencies.source.listFeeds()) {
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
    }
    return totalNewSignals;
  };
}
