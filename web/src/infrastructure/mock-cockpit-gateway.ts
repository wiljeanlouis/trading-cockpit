import type {
  CreateTradePlanRequest,
  CreateTradePlanResponse,
  DashboardSummaryDto,
  ExecuteTradePlanRequest,
  ExecuteTradePlanResponse,
  TradePlanItemDto,
  TradePlansDto,
  TradingAccountsDto,
  WatchlistDto
} from '@trading-cockpit/contracts';
import type { CockpitGateway } from './cockpit-gateway';

const DEVELOPMENT_SUMMARY: DashboardSummaryDto = {
  generatedAt: '2026-08-28T16:00:00.000Z',
  signals: 18,
  watchlist: 8,
  ready: 3,
  activeTradePlans: 2,
  openPositions: 1,
  closedTrades: 14
};

const DEVELOPMENT_WATCHLIST: WatchlistDto = {
  generatedAt: '2026-08-28T16:00:00.000Z',
  items: [
    {
      id: 'W-BOX-20260827',
      ticker: 'BOX',
      company: 'Box, Inc.',
      sector: 'Technology',
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyName: 'Momentum Breakout',
      strategyVersion: '1.0',
      signalDate: '2026-08-27T04:00:00.000Z',
      signalPrice: 33.4,
      currentPrice: 34.82,
      momentumScore: 87,
      status: 'READY',
      setupStatus: 'VALID',
      breakoutLevel: 34.5,
      invalidationLevel: 32.8,
      earningsDate: '2026-09-10T04:00:00.000Z',
      eventRisk: 'CLEAR',
      notes: 'Development fixture'
    },
    {
      id: 'W-URNB-20260826',
      ticker: 'URNB',
      company: 'Ur-Nergy Inc.',
      sector: 'Energy',
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyName: 'Momentum Breakout',
      strategyVersion: '1.0',
      signalDate: '2026-08-26T04:00:00.000Z',
      signalPrice: 1.68,
      currentPrice: 1.74,
      momentumScore: 72,
      status: 'WATCHING',
      setupStatus: '',
      breakoutLevel: null,
      invalidationLevel: null,
      earningsDate: null,
      eventRisk: null,
      notes: null
    }
  ]
};

const DEVELOPMENT_TRADE_PLANS: TradePlanItemDto[] = [
  {
    id: 'DEMO-TP-BOX',
    watchlistId: 'W-BOX-20260827',
    accountId: 'DEMO-CAD',
    ticker: 'BOX',
    strategyId: 'MOMENTUM_BREAKOUT',
    strategyName: 'Momentum Breakout',
    strategyVersion: '1.0',
    signalDate: '2026-08-27T04:00:00.000Z',
    signalPrice: 33.4,
    referencePrice: 34.82,
    momentumScore: 87,
    setupStatus: 'CONFIRMED',
    breakoutLevel: 34.5,
    invalidationLevel: 32.8,
    eventRisk: 'CLEAR',
    createdAt: '2026-08-28T14:00:00.000Z',
    entryType: 'BREAKOUT',
    entryPrice: 35,
    stopPrice: 32.8,
    targetPrice: 40,
    riskPerShare: 2.2,
    rewardPerShare: 5,
    riskReward: 2.27,
    accountEquity: 10_000,
    riskPercent: 0.01,
    maxRisk: 100,
    positionSize: 45,
    positionValue: 1575,
    status: 'READY',
    notes: 'Development fixture'
  },
  {
    id: 'DEMO-TP-URNB',
    watchlistId: 'W-URNB-20260826',
    accountId: 'DEMO-USD',
    ticker: 'URNB',
    strategyId: 'MOMENTUM_BREAKOUT',
    strategyName: 'Momentum Breakout',
    strategyVersion: '1.0',
    signalDate: '2026-08-26T04:00:00.000Z',
    signalPrice: 1.68,
    referencePrice: 1.74,
    momentumScore: 72,
    setupStatus: null,
    breakoutLevel: null,
    invalidationLevel: 1.55,
    eventRisk: null,
    createdAt: '2026-08-28T15:00:00.000Z',
    entryType: 'BREAKOUT',
    entryPrice: null,
    stopPrice: 1.55,
    targetPrice: null,
    riskPerShare: null,
    rewardPerShare: null,
    riskReward: null,
    accountEquity: 20_000,
    riskPercent: 0.005,
    maxRisk: 100,
    positionSize: null,
    positionValue: null,
    status: 'DRAFT',
    notes: null
  }
];

export class MockCockpitGateway implements CockpitGateway {
  private watchlistItems = DEVELOPMENT_WATCHLIST.items.map((item) => ({ ...item }));
  private tradePlanItems = DEVELOPMENT_TRADE_PLANS.map((item) => ({ ...item }));
  async getDashboardSummary(): Promise<DashboardSummaryDto> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return { ...DEVELOPMENT_SUMMARY, generatedAt: new Date().toISOString() };
  }

  async getWatchlist(): Promise<WatchlistDto> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return {
      generatedAt: new Date().toISOString(),
      items: this.watchlistItems.map((item) => ({ ...item }))
    };
  }

  async getTradingAccounts(): Promise<TradingAccountsDto> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return {
      accounts: [
        { id: 'DEMO-CAD', name: 'Development CAD', baseCurrency: 'CAD' },
        { id: 'DEMO-USD', name: 'Development USD', baseCurrency: 'USD' }
      ]
    };
  }

  async createTradePlan(request: CreateTradePlanRequest): Promise<CreateTradePlanResponse> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const candidate = this.watchlistItems.find((item) => item.id === request.watchlistId);
    if (!candidate) throw new Error(`Development candidate not found: ${request.watchlistId}`);
    candidate.status = 'PLANNED';
    const tradePlanId = `DEMO-TP-${candidate.ticker}-${request.accountId}`;
    return {
      kind: 'created',
      tradePlanId,
      watchlistId: candidate.id,
      ticker: candidate.ticker,
      accountId: request.accountId,
      status: 'DRAFT'
    };
  }

  async getTradePlans(): Promise<TradePlansDto> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return {
      generatedAt: new Date().toISOString(),
      items: this.tradePlanItems.map((item) => ({ ...item }))
    };
  }

  async executeTradePlan(request: ExecuteTradePlanRequest): Promise<ExecuteTradePlanResponse> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const plan = this.tradePlanItems.find((item) => item.id === request.tradePlanId);
    if (!plan) throw new Error(`Development Trade Plan not found: ${request.tradePlanId}`);
    plan.status = 'EXECUTED';
    return {
      kind: 'opened',
      positionId: `DEMO-P-${plan.ticker}-${plan.accountId}`,
      tradePlanId: plan.id,
      accountId: plan.accountId,
      ticker: plan.ticker,
      openedAt: new Date().toISOString(),
      actualEntry: plan.entryPrice,
      actualQuantity: plan.positionSize,
      positionStatus: 'OPEN'
    };
  }
}
