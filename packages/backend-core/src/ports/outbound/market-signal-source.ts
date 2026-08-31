import type { MarketSignalBatch, MarketSignalFeed } from '../../domain/market-signal';

export interface MarketSignalSource {
  listFeeds(): MarketSignalFeed[];
  fetchSignals(feedId: string): MarketSignalBatch;
}
