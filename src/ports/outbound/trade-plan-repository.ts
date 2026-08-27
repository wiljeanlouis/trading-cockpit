import type { TradePlan } from '../../core/domain/trade-plan';

export interface TradePlanRepository {
  findById(id: string): TradePlan | null;
  findActiveByWatchlistId(watchlistId: string): TradePlan | null;
  save(tradePlan: TradePlan): void;
  updateStatus(id: string, status: string): void;
}
