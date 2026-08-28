import type {
  CreateTradePlanRequest,
  CreateTradePlanResponse,
  DashboardSummaryDto,
  TradingAccountsDto,
  WatchlistDto
} from '@trading-cockpit/contracts';

export interface CockpitGateway {
  getDashboardSummary(): Promise<DashboardSummaryDto>;
  getWatchlist(): Promise<WatchlistDto>;
  getTradingAccounts(): Promise<TradingAccountsDto>;
  createTradePlan(request: CreateTradePlanRequest): Promise<CreateTradePlanResponse>;
}
