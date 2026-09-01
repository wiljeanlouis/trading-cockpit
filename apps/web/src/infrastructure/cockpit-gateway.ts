import type {
  AnalyticsDto,
  AdminOverviewDto,
  AddMomentumCandidateToWatchlistRequest,
  AddMomentumCandidateToWatchlistResponse,
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
  UpdateTradingAccountRequest,
  UpdateTradePlanPlanningRequest,
  UpdateTradePlanPlanningResponse,
  WatchlistDto
} from '@trading-cockpit/contracts';

export interface AccountScopedQuery {
  accountId?: string | null;
}

export interface AnalyticsQuery extends AccountScopedQuery {
  strategyId?: string | null;
  strategyVersion?: string | null;
}

export interface CockpitGateway {
  getDashboard(query?: AccountScopedQuery): Promise<DashboardDto>;
  getDashboardSummary(): Promise<DashboardSummaryDto>;
  getWatchlist(): Promise<WatchlistDto>;
  getMomentumRanking(): Promise<MomentumRankingDto>;
  refreshFinviz(): Promise<number>;
  refreshMomentumRanking(): Promise<void>;
  addMomentumCandidateToWatchlist(
    request: AddMomentumCandidateToWatchlistRequest
  ): Promise<AddMomentumCandidateToWatchlistResponse>;
  getAnalytics(query?: AnalyticsQuery): Promise<AnalyticsDto>;
  getAdminOverview(): Promise<AdminOverviewDto>;
  getTradingAccounts(): Promise<TradingAccountsDto>;
  getTradingConfig(): Promise<TradingConfigDto>;
  setupMomentumRanking(): Promise<void>;
  setupStrategies(): Promise<void>;
  validateStrategies(): Promise<boolean>;
  setupCockpitConfig(): Promise<void>;
  setupTradingAccounts(): Promise<void>;
  createTradingAccount(
    request: CreateTradingAccountRequest
  ): Promise<TradingAccountMutationResponse>;
  createFundedTradingAccount(
    request: CreateFundedTradingAccountRequest
  ): Promise<TradingAccountMutationResponse>;
  updateTradingAccount(
    request: UpdateTradingAccountRequest
  ): Promise<TradingAccountMutationResponse>;
  recordCapitalTransaction(
    request: RecordCapitalTransactionRequest
  ): Promise<RecordCapitalTransactionResponse>;
  checkFinvizAuth(): Promise<boolean>;
  setFinvizToken(token: string): Promise<void>;
  deleteFinvizToken(): Promise<void>;
  createTradePlan(request: CreateTradePlanRequest): Promise<CreateTradePlanResponse>;
  getTradePlans(): Promise<TradePlansDto>;
  executeTradePlan(request: ExecuteTradePlanRequest): Promise<ExecuteTradePlanResponse>;
  getOpenPositions(): Promise<OpenPositionsDto>;
  closePosition(request: ClosePositionRequest): Promise<ClosePositionResponse>;
  getJournal(): Promise<JournalDto>;
  updateTradePlanPlanning(
    request: UpdateTradePlanPlanningRequest
  ): Promise<UpdateTradePlanPlanningResponse>;
}
