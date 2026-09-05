import { vi } from 'vitest';
import type {
  AddMomentumCandidateToWatchlistRequest,
  AdminOverviewDto,
  AnalyticsDto,
  CreateFundedTradingAccountRequest,
  DashboardDto,
  RecordCapitalTransactionRequest,
  RecordCapitalTransactionResponse,
  CreateTradingAccountRequest,
  TradingAccountMutationResponse,
  UpdateTradingAccountRequest
} from '@trading-cockpit/contracts';
import type { CockpitGateway } from '../../src/infrastructure/cockpit-gateway';

const EMPTY_ANALYTICS: AnalyticsDto = {
  generatedAt: new Date().toISOString(),
  available: false,
  summary: {
    trades: 0,
    wins: 0,
    losses: 0,
    breakeven: 0,
    winRate: 0,
    profitFactor: null,
    totalPnl: 0,
    realizedPnl: 0,
    averagePnl: 0,
    bestPnl: 0,
    grossProfit: 0,
    grossLoss: 0,
    worstPnl: 0,
    totalR: 0,
    averageR: 0,
    expectancyR: 0,
    averageWinnerR: 0,
    averageLoserR: 0,
    bestR: 0
  },
  byStrategy: [],
  byStrategyVersion: [],
  byAccount: []
};

const EMPTY_ADMIN_OVERVIEW: AdminOverviewDto = {
  finviz: { configured: false },
  accounts: []
};

const EMPTY_DASHBOARD: DashboardDto = {
  generatedAt: new Date().toISOString(),
  summary: {
    generatedAt: new Date().toISOString(),
    signals: 0,
    watchlist: 0,
    ready: 0,
    activeTradePlans: 0,
    openPositions: 0,
    closedTrades: 0
  },
  account: {
    accountName: '',
    accountEquity: 0,
    defaultRiskPercent: 0,
    maxPositionPercent: 0,
    currency: 'CAD'
  },
  pipeline: {
    signals: 0,
    watchlist: 0,
    ready: 0,
    nearBreakout: 0,
    activeTradePlans: 0,
    openPositions: 0,
    closedTrades: 0
  },
  performance: {
    trades: 0,
    wins: 0,
    realizedPnl: 0,
    winRate: 0,
    averageR: 0,
    totalR: 0
  },
  topMomentum: [],
  watchlistPreview: [],
  openPositionsPreview: [],
  actions: {
    nearBreakout: [],
    ready: [],
    openPositions: []
  }
};

const EMPTY_CAPITAL_TRANSACTION_RESPONSE: RecordCapitalTransactionResponse = {
  transactionId: '',
  accountId: '',
  type: 'INITIAL_FUNDING',
  amount: 0,
  occurredAt: new Date().toISOString(),
  note: ''
};

export function createGatewayStub(overrides: Partial<CockpitGateway> = {}): CockpitGateway {
  return {
    getDashboard: vi.fn(async () => EMPTY_DASHBOARD),
    getDashboardSummary: vi.fn(async () => ({
      generatedAt: new Date().toISOString(),
      signals: 0,
      watchlist: 0,
      ready: 0,
      activeTradePlans: 0,
      openPositions: 0,
      closedTrades: 0
    })),
    getWatchlist: vi.fn(),
    getMomentumRanking: vi.fn(async () => ({ generatedAt: new Date().toISOString(), items: [] })),
    refreshFinviz: vi.fn(async () => 0),
    refreshMomentumRanking: vi.fn(async () => {}),
    addMomentumCandidateToWatchlist: vi.fn(
      async (_request: AddMomentumCandidateToWatchlistRequest) => ({
        kind: 'added' as const,
        watchlistId: '',
        ticker: '',
        status: 'WATCHING'
      })
    ),
    getAnalytics: vi.fn(async () => EMPTY_ANALYTICS),
    getAdminOverview: vi.fn(async () => EMPTY_ADMIN_OVERVIEW),
    getTradingAccounts: vi.fn(async () => ({ accounts: [] })),
    setupMomentumRanking: vi.fn(async () => {}),
    setupStrategies: vi.fn(async () => {}),
    validateStrategies: vi.fn(async () => true),
    setupTradingAccounts: vi.fn(async () => {}),
    createTradingAccount: vi.fn(
      async (request: CreateTradingAccountRequest): Promise<TradingAccountMutationResponse> => ({
        id: request.accountId,
        name: request.name,
        baseCurrency: request.baseCurrency,
        riskPercentPerTrade: request.riskPercentPerTrade
      })
    ),
    createFundedTradingAccount: vi.fn(
      async (
        request: CreateFundedTradingAccountRequest
      ): Promise<TradingAccountMutationResponse> => ({
        id: request.accountId,
        name: request.name,
        baseCurrency: request.baseCurrency,
        riskPercentPerTrade: request.riskPercentPerTrade
      })
    ),
    updateTradingAccount: vi.fn(
      async (request: UpdateTradingAccountRequest): Promise<TradingAccountMutationResponse> => ({
        id: request.accountId,
        name: request.name,
        baseCurrency: request.baseCurrency,
        riskPercentPerTrade: request.riskPercentPerTrade
      })
    ),
    recordCapitalTransaction: vi.fn(
      async (_request: RecordCapitalTransactionRequest) => EMPTY_CAPITAL_TRANSACTION_RESPONSE
    ),
    checkFinvizAuth: vi.fn(async () => false),
    setFinvizToken: vi.fn(async () => {}),
    deleteFinvizToken: vi.fn(async () => {}),
    createTradePlan: vi.fn(),
    getTradePlans: vi.fn(),
    executeTradePlan: vi.fn(),
    getOpenPositions: vi.fn(),
    closePosition: vi.fn(),
    getJournal: vi.fn(),
    updateTradePlanPlanning: vi.fn(),
    ...overrides
  };
}
