import type {
  CreateTradePlanRequest,
  CreateTradePlanResponse,
  DashboardSummaryDto,
  TradingAccountsDto,
  WatchlistDto
} from '@trading-cockpit/contracts';
import type { CockpitGateway } from '../cockpit-gateway';

function failureMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }
  return String(error || 'Unknown Apps Script error');
}

export class AppsScriptCockpitGateway implements CockpitGateway {
  getDashboardSummary(): Promise<DashboardSummaryDto> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .getDashboardSummary();
    });
  }

  getWatchlist(): Promise<WatchlistDto> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .getWatchlist();
    });
  }

  getTradingAccounts(): Promise<TradingAccountsDto> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .getTradingAccounts();
    });
  }

  createTradePlan(request: CreateTradePlanRequest): Promise<CreateTradePlanResponse> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .createTradePlan(request);
    });
  }
}
