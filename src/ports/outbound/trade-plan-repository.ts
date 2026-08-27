import type { TradePlan } from '../../core/domain/trade-plan';

export interface TradePlanRepository {
  findActiveByWatchlistId(watchlistId: string): TradePlan | null;
  save(tradePlan: TradePlan): void;
}
