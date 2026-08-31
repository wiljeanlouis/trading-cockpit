import type { MarketSignalBatch } from '../../domain/market-signal';

export interface MarketSignalProjection {
  replace(batch: MarketSignalBatch, refreshedAt: Date): void;
}
