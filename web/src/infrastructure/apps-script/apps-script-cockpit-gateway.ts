import type {
  CreateTradePlanRequest,
  CreateTradePlanResponse,
  ClosePositionRequest,
  ClosePositionResponse,
  DashboardSummaryDto,
  ExecuteTradePlanRequest,
  ExecuteTradePlanResponse,
  OpenPositionsDto,
  TradePlansDto,
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

  getTradePlans(): Promise<TradePlansDto> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .getTradePlans();
    });
  }

  executeTradePlan(request: ExecuteTradePlanRequest): Promise<ExecuteTradePlanResponse> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .executeTradePlan(request);
    });
  }

  getOpenPositions(): Promise<OpenPositionsDto> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .getOpenPositions();
    });
  }

  closePosition(request: ClosePositionRequest): Promise<ClosePositionResponse> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .closePosition(request);
    });
  }
}
