import type {
  CreateTradePlanRequest,
  CreateTradePlanResponse,
  ClosePositionRequest,
  ClosePositionResponse,
  DashboardSummaryDto,
  ExecuteTradePlanRequest,
  ExecuteTradePlanResponse,
  OpenPositionsDto,
  JournalDto,
  TradePlansDto,
  TradingAccountsDto,
  UpdateTradePlanPlanningRequest,
  UpdateTradePlanPlanningResponse,
  WatchlistDto
} from '@trading-cockpit/contracts';

export interface CockpitGateway {
  getDashboardSummary(): Promise<DashboardSummaryDto>;
  getWatchlist(): Promise<WatchlistDto>;
  getTradingAccounts(): Promise<TradingAccountsDto>;
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
