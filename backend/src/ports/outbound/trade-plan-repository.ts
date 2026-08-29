import type { TradePlan } from '../../core/domain/trade-plan';

export interface TradePlanRepository {
  findById(id: string): TradePlan | null;
  findActiveByWatchlistIdAndAccountId(watchlistId: string, accountId: string): TradePlan | null;
  save(tradePlan: TradePlan): void;
  updatePlanning(tradePlan: TradePlan, options?: { positionSizeOverridden: boolean }): void;
  updateStatus(id: string, status: string): void;
}
