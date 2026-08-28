import type { MarketSignalBatch, MarketSignalFeed } from '../../core/domain/market-signal';

export interface MarketSignalSource {
  listFeeds(): MarketSignalFeed[];
  fetchSignals(feedId: string): MarketSignalBatch;
}
