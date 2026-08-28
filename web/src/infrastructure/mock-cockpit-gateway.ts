import type { DashboardSummaryDto, WatchlistDto } from '@trading-cockpit/contracts';
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
      currentPrice: 34.82,
      momentumScore: 87,
      status: 'READY',
      setupStatus: 'VALID'
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
      currentPrice: 1.74,
      momentumScore: 72,
      status: 'WATCHING',
      setupStatus: ''
    }
  ]
};

export class MockCockpitGateway implements CockpitGateway {
  async getDashboardSummary(): Promise<DashboardSummaryDto> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return { ...DEVELOPMENT_SUMMARY, generatedAt: new Date().toISOString() };
  }

  async getWatchlist(): Promise<WatchlistDto> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return {
      generatedAt: new Date().toISOString(),
      items: DEVELOPMENT_WATCHLIST.items.map((item) => ({ ...item }))
    };
  }
}
