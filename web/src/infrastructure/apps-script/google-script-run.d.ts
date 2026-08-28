import type {
  CreateTradePlanRequest,
  CreateTradePlanResponse,
  DashboardSummaryDto,
  TradingAccountsDto,
  WatchlistDto
} from '@trading-cockpit/contracts';

interface CockpitScriptRunner {
  withSuccessHandler(handler: (value: DashboardSummaryDto) => void): CockpitScriptRunner;
  withSuccessHandler(handler: (value: WatchlistDto) => void): CockpitScriptRunner;
  withSuccessHandler(handler: (value: TradingAccountsDto) => void): CockpitScriptRunner;
  withSuccessHandler(handler: (value: CreateTradePlanResponse) => void): CockpitScriptRunner;
  withFailureHandler(handler: (error: unknown) => void): CockpitScriptRunner;
  getDashboardSummary(): void;
  getWatchlist(): void;
  getTradingAccounts(): void;
  createTradePlan(request: CreateTradePlanRequest): void;
}

declare global {
  const google: {
    script: {
      run: CockpitScriptRunner;
    };
  };
}

export {};
