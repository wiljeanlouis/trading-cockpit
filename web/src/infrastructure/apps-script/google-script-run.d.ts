import type { DashboardSummaryDto, WatchlistDto } from '@trading-cockpit/contracts';

interface CockpitScriptRunner {
  withSuccessHandler(handler: (value: DashboardSummaryDto) => void): CockpitScriptRunner;
  withSuccessHandler(handler: (value: WatchlistDto) => void): CockpitScriptRunner;
  withFailureHandler(handler: (error: unknown) => void): CockpitScriptRunner;
  getDashboardSummary(): void;
  getWatchlist(): void;
}

declare global {
  const google: {
    script: {
      run: CockpitScriptRunner;
    };
  };
}

export {};
