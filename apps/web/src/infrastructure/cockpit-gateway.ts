import type {
  AnalyticsDto,
  AdminOverviewDto,
  AddDiscoveryCandidateToWatchlistRequest,
  AddDiscoveryCandidateToWatchlistResponse,
  CreateTradePlanRequest,
  CreateTradePlanResponse,
  ClosePositionRequest,
  ClosePositionResponse,
  CreateFundedTradingAccountRequest,
  CreateStrategyRequest,
  CreateStrategyVersionRequest,
  CreateTradingAccountRequest,
  DashboardDto,
  DashboardSummaryDto,
  RecordCapitalTransactionRequest,
  RecordCapitalTransactionResponse,
  ExecuteTradePlanRequest,
  ExecuteTradePlanResponse,
  DiscoveryDto,
  RefreshSignalsRequest,
  RefreshSignalsResponse,
  OpenPositionsDto,
  JournalDto,
  TradePlansDto,
  TradingAccountsDto,
  TradingAccountMutationResponse,
  UpdateStrategyRequest,
  UpdateStrategyVersionRequest,
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
  getDiscovery(): Promise<DiscoveryDto>;
  refreshSignals(request: RefreshSignalsRequest): Promise<RefreshSignalsResponse>;
  refreshAllSignals(): Promise<RefreshSignalsResponse>;
  addDiscoveryCandidateToWatchlist(
    request: AddDiscoveryCandidateToWatchlistRequest
  ): Promise<AddDiscoveryCandidateToWatchlistResponse>;
  getAnalytics(query?: AnalyticsQuery): Promise<AnalyticsDto>;
  getAdminOverview(): Promise<AdminOverviewDto>;
  getTradingAccounts(): Promise<TradingAccountsDto>;
  setupStrategies(): Promise<void>;
  validateStrategies(): Promise<boolean>;
  createStrategy(request: CreateStrategyRequest): Promise<void>;
  updateStrategy(request: UpdateStrategyRequest): Promise<void>;
  createStrategyVersion(request: CreateStrategyVersionRequest): Promise<void>;
  updateStrategyVersion(request: UpdateStrategyVersionRequest): Promise<void>;
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
