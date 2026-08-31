import type {
  AnalyticsDto,
  AddMomentumCandidateToWatchlistRequest,
  AddMomentumCandidateToWatchlistResponse,
  CreateTradePlanRequest,
  CreateTradePlanResponse,
  ClosePositionRequest,
  ClosePositionResponse,
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
  UpdateTradePlanPlanningRequest,
  UpdateTradePlanPlanningResponse,
  WatchlistDto
} from '@trading-cockpit/contracts';

export interface CockpitGateway {
  getDashboard(): Promise<DashboardDto>;
  getDashboardSummary(): Promise<DashboardSummaryDto>;
  getWatchlist(): Promise<WatchlistDto>;
  getMomentumRanking(): Promise<MomentumRankingDto>;
  refreshFinviz(): Promise<number>;
  refreshMomentumRanking(): Promise<void>;
  addMomentumCandidateToWatchlist(
    request: AddMomentumCandidateToWatchlistRequest
  ): Promise<AddMomentumCandidateToWatchlistResponse>;
  getAnalytics(): Promise<AnalyticsDto>;
  getTradingAccounts(): Promise<TradingAccountsDto>;
  getTradingConfig(): Promise<TradingConfigDto>;
  setupMomentumRanking(): Promise<void>;
  setupStrategies(): Promise<void>;
  validateStrategies(): Promise<boolean>;
  setupCockpitConfig(): Promise<void>;
  setupTradingAccounts(): Promise<void>;
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
