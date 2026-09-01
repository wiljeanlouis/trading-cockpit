import type {
  AnalyticsDto,
  AddMomentumCandidateToWatchlistRequest,
  AddMomentumCandidateToWatchlistResponse,
  CreateTradePlanRequest,
  CreateTradePlanResponse,
  ClosePositionRequest,
  ClosePositionResponse,
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

interface CockpitScriptRunner {
  withSuccessHandler(handler: (value: DashboardDto) => void): CockpitScriptRunner;
  withSuccessHandler(handler: (value: DashboardSummaryDto) => void): CockpitScriptRunner;
  withSuccessHandler(handler: (value: WatchlistDto) => void): CockpitScriptRunner;
  withSuccessHandler(handler: (value: MomentumRankingDto) => void): CockpitScriptRunner;
  withSuccessHandler(
    handler: (value: AddMomentumCandidateToWatchlistResponse) => void
  ): CockpitScriptRunner;
  withSuccessHandler(handler: (value: AnalyticsDto) => void): CockpitScriptRunner;
  withSuccessHandler(handler: (value: TradingAccountsDto) => void): CockpitScriptRunner;
  withSuccessHandler(
    handler: (value: TradingAccountMutationResponse) => void
  ): CockpitScriptRunner;
  withSuccessHandler(handler: (value: TradingConfigDto) => void): CockpitScriptRunner;
  withSuccessHandler(handler: (value: number) => void): CockpitScriptRunner;
  withSuccessHandler(handler: (value: boolean) => void): CockpitScriptRunner;
  withSuccessHandler(handler: (value: void) => void): CockpitScriptRunner;
  withSuccessHandler(handler: (value: CreateTradePlanResponse) => void): CockpitScriptRunner;
  withSuccessHandler(
    handler: (value: RecordCapitalTransactionResponse) => void
  ): CockpitScriptRunner;
  withSuccessHandler(handler: (value: TradePlansDto) => void): CockpitScriptRunner;
  withSuccessHandler(handler: (value: ExecuteTradePlanResponse) => void): CockpitScriptRunner;
  withSuccessHandler(handler: (value: OpenPositionsDto) => void): CockpitScriptRunner;
  withSuccessHandler(handler: (value: ClosePositionResponse) => void): CockpitScriptRunner;
  withSuccessHandler(handler: (value: JournalDto) => void): CockpitScriptRunner;
  withSuccessHandler(
    handler: (value: UpdateTradePlanPlanningResponse) => void
  ): CockpitScriptRunner;
  withFailureHandler(handler: (error: unknown) => void): CockpitScriptRunner;
  getDashboard(): void;
  getDashboardSummary(): void;
  getWatchlist(): void;
  getMomentumRanking(): void;
  refreshFinviz(): void;
  refreshMomentumRanking(): void;
  addMomentumCandidateToWatchlist(request: AddMomentumCandidateToWatchlistRequest): void;
  getAnalytics(): void;
  refreshAnalytics(): void;
  getTradingAccounts(): void;
  getTradingConfig(): void;
  setupMomentumRanking(): void;
  setupStrategies(): void;
  validateStrategies(): void;
  setupCockpitConfig(): void;
  setupTradingAccounts(): void;
  createTradingAccount(request: CreateTradingAccountRequest): void;
  updateTradingAccount(request: UpdateTradingAccountRequest): void;
  recordCapitalTransaction(request: RecordCapitalTransactionRequest): void;
  checkFinvizAuth(): void;
  setFinvizToken(token: string): void;
  deleteFinvizToken(): void;
  createTradePlan(request: CreateTradePlanRequest): void;
  getTradePlans(): void;
  executeTradePlan(request: ExecuteTradePlanRequest): void;
  getOpenPositions(): void;
  closePosition(request: ClosePositionRequest): void;
  getJournal(): void;
  updateTradePlanPlanning(request: UpdateTradePlanPlanningRequest): void;
}

declare global {
  const google: {
    script: {
      run: CockpitScriptRunner;
    };
  };
}

export {};
