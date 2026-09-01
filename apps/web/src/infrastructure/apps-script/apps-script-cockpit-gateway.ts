import type {
  AnalyticsDto,
  AddMomentumCandidateToWatchlistRequest,
  AddMomentumCandidateToWatchlistResponse,
  AdminOverviewDto,
  CreateTradePlanRequest,
  CreateTradePlanResponse,
  ClosePositionRequest,
  ClosePositionResponse,
  CreateFundedTradingAccountRequest,
  CreateTradingAccountRequest,
  DashboardDto,
  DashboardSummaryDto,
  RecordCapitalTransactionRequest,
  RecordCapitalTransactionResponse,
  ExecuteTradePlanRequest,
  ExecuteTradePlanResponse,
  MomentumRankingDto,
  OpenPositionsDto,
  JournalDto,
  TradePlansDto,
  TradingConfigDto,
  TradingAccountsDto,
  TradingAccountMutationResponse,
  UpdateTradePlanPlanningRequest,
  UpdateTradingAccountRequest,
  UpdateTradePlanPlanningResponse,
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
  getDashboard(): Promise<DashboardDto> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .getDashboard();
    });
  }

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

  getMomentumRanking(): Promise<MomentumRankingDto> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .getMomentumRanking();
    });
  }

  refreshFinviz(): Promise<number> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .refreshFinviz();
    });
  }

  refreshMomentumRanking(): Promise<void> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .refreshMomentumRanking();
    });
  }

  addMomentumCandidateToWatchlist(
    request: AddMomentumCandidateToWatchlistRequest
  ): Promise<AddMomentumCandidateToWatchlistResponse> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .addMomentumCandidateToWatchlist(request);
    });
  }

  getAnalytics(): Promise<AnalyticsDto> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .getAnalytics();
    });
  }

  getAdminOverview(): Promise<AdminOverviewDto> {
    return Promise.reject(new Error('Admin Overview is available through the Cloud Run API.'));
  }

  getTradingAccounts(): Promise<TradingAccountsDto> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .getTradingAccounts();
    });
  }

  getTradingConfig(): Promise<TradingConfigDto> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .getTradingConfig();
    });
  }

  setupMomentumRanking(): Promise<void> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .setupMomentumRanking();
    });
  }

  setupStrategies(): Promise<void> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .setupStrategies();
    });
  }

  validateStrategies(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .validateStrategies();
    });
  }

  setupCockpitConfig(): Promise<void> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .setupCockpitConfig();
    });
  }

  setupTradingAccounts(): Promise<void> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .setupTradingAccounts();
    });
  }

  createTradingAccount(
    _request: CreateTradingAccountRequest
  ): Promise<TradingAccountMutationResponse> {
    return Promise.reject(
      new Error('Trading Account management is available through the Cloud Run API.')
    );
  }

  createFundedTradingAccount(
    _request: CreateFundedTradingAccountRequest
  ): Promise<TradingAccountMutationResponse> {
    return Promise.reject(
      new Error('Trading Account management is available through the Cloud Run API.')
    );
  }

  updateTradingAccount(
    _request: UpdateTradingAccountRequest
  ): Promise<TradingAccountMutationResponse> {
    return Promise.reject(
      new Error('Trading Account management is available through the Cloud Run API.')
    );
  }

  recordCapitalTransaction(
    request: RecordCapitalTransactionRequest
  ): Promise<RecordCapitalTransactionResponse> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .recordCapitalTransaction(request);
    });
  }

  checkFinvizAuth(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .checkFinvizAuth();
    });
  }

  setFinvizToken(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .setFinvizToken(token);
    });
  }

  deleteFinvizToken(): Promise<void> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .deleteFinvizToken();
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

  getJournal(): Promise<JournalDto> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .getJournal();
    });
  }

  updateTradePlanPlanning(
    request: UpdateTradePlanPlanningRequest
  ): Promise<UpdateTradePlanPlanningResponse> {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(failureMessage(error))))
        .updateTradePlanPlanning(request);
    });
  }
}
