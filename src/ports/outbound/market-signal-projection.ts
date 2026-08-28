import type { MarketSignalBatch } from '../../core/domain/market-signal';

export interface MarketSignalProjection {
  replace(batch: MarketSignalBatch, refreshedAt: Date): void;
}
