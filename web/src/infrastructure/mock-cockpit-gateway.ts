import type {
  CreateTradePlanRequest,
  CreateTradePlanResponse,
  DashboardSummaryDto,
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

export class MockCockpitGateway implements CockpitGateway {
  private watchlistItems = DEVELOPMENT_WATCHLIST.items.map((item) => ({ ...item }));
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
    return {
      kind: 'created',
      tradePlanId: `DEMO-TP-${candidate.ticker}`,
      watchlistId: candidate.id,
      ticker: candidate.ticker,
      accountId: request.accountId,
      status: 'DRAFT'
    };
  }
}
