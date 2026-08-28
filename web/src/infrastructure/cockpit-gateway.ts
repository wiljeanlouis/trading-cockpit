import type { DashboardSummaryDto, WatchlistDto } from '@trading-cockpit/contracts';

export interface CockpitGateway {
  getDashboardSummary(): Promise<DashboardSummaryDto>;
  getWatchlist(): Promise<WatchlistDto>;
}
