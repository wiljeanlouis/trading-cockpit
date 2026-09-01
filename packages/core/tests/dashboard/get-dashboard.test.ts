import { describe, expect, it, vi } from 'vitest';
import type { AnalyticsDto } from '@trading-cockpit/contracts';
import { createGetDashboard } from '@trading-cockpit/core/application/dashboard/get-dashboard';
import type { PortfolioEquitySummary } from '@trading-cockpit/core/application/trading-account/get-portfolio-equity';
import type { DashboardRepositorySnapshot } from '@trading-cockpit/core/ports/outbound/dashboard-repository';

const analytics: AnalyticsDto = {
  generatedAt: '2026-08-28T16:00:00.000Z',
  available: true,
  summary: {
    trades: 3,
    wins: 2,
    losses: 1,
    breakeven: 0,
    winRate: 2 / 3,
    profitFactor: 2,
    totalPnl: 250,
    realizedPnl: 250,
    averagePnl: 83.33,
    bestPnl: 200,
    grossProfit: 500,
    grossLoss: -250,
    worstPnl: -250,
    totalR: 2.5,
    averageR: 0.833,
    expectancyR: 0.4,
    averageWinnerR: 1.5,
    averageLoserR: -0.5,
    bestR: 2
  },
  byStrategy: [],
  byStrategyVersion: [],
  byAccount: []
};

const portfolioEquity: PortfolioEquitySummary = {
  scope: { type: 'ALL' },
  accountId: null,
  accountName: 'All Accounts',
  accountCount: 2,
  baseCurrency: 'CAD',
  netExternalCapital: 30_000,
  realizedPnl: 250,
  realizedEquity: 30_250,
  basis: 'REALIZED',
  accounts: []
};

function snapshot(): DashboardRepositorySnapshot {
  return {
    momentumCandidates: [
      {
        rank: 1,
        ticker: 'BOX',
        score: 87,
        price: 34.98,
        high52: 0.01,
        relativeVolume: 1.5,
        rsi: 61,
        reviewStatus: 'REVIEW'
      },
      {
        rank: 2,
        ticker: 'NVDA',
        score: 86,
        price: 217.55,
        high52: 0.02,
        relativeVolume: 1.8,
        rsi: 63,
        reviewStatus: 'WATCH'
      }
    ],
    watchlist: [
      {
        ticker: 'BOX',
        currentPrice: 34,
        signalPrice: 33,
        changeSinceSignal: 0.03,
        breakoutLevel: 35,
        distanceToBreakout: -0.01,
        setupStatus: 'CONFIRMED',
        status: 'READY'
      },
      {
        ticker: 'DK',
        currentPrice: 70,
        signalPrice: 68,
        changeSinceSignal: 0.02,
        breakoutLevel: 72,
        distanceToBreakout: -0.015,
        setupStatus: null,
        status: 'WATCHING'
      },
      {
        ticker: 'REJ',
        currentPrice: 10,
        signalPrice: 10,
        changeSinceSignal: 0,
        breakoutLevel: 11,
        distanceToBreakout: -0.01,
        setupStatus: null,
        status: 'REJECTED'
      }
    ],
    tradePlans: [
      { accountId: 'A1', status: 'DRAFT' },
      { accountId: 'A2', status: 'READY' },
      { accountId: 'A2', status: 'EXECUTED' }
    ],
    positions: [
      {
        accountId: 'A1',
        ticker: 'BOX',
        actualEntry: 33,
        currentPrice: 34,
        currentStop: 33.8,
        target: 38,
        actualQuantity: 40,
        unrealizedPnl: 40,
        unrealizedPnlPercent: 0.03,
        status: 'OPEN'
      },
      {
        accountId: 'A2',
        ticker: 'NVDA',
        actualEntry: 200,
        currentPrice: 220,
        currentStop: 210,
        target: 240,
        actualQuantity: 5,
        unrealizedPnl: 100,
        unrealizedPnlPercent: 0.1,
        status: 'OPEN'
      },
      {
        accountId: 'A1',
        ticker: 'OLD',
        actualEntry: 10,
        currentPrice: 12,
        currentStop: 11,
        target: 14,
        actualQuantity: 10,
        unrealizedPnl: 20,
        unrealizedPnlPercent: 0.2,
        status: 'CLOSED'
      }
    ]
  };
}

describe('get Dashboard', () => {
  it('migrates legacy Dashboard operational rules into a backend DTO', () => {
    const getAnalytics = vi.fn(() => analytics);
    const getDashboard = createGetDashboard({
      repository: { readSnapshot: snapshot },
      getAnalytics,
      getPortfolioEquity: () => portfolioEquity,
      now: () => new Date('2026-08-28T18:00:00.000Z')
    });

    const dashboard = getDashboard();

    expect(getAnalytics).toHaveBeenCalledOnce();
    expect(dashboard.generatedAt).toBe('2026-08-28T18:00:00.000Z');
    expect(dashboard.account).toMatchObject({
      scope: { type: 'ALL' },
      accountName: 'All Accounts',
      accountEquity: 30_250,
      netExternalCapital: 30_000,
      realizedPnl: 250,
      realizedEquity: 30_250,
      accountCount: 2
    });
    expect(dashboard.pipeline).toMatchObject({
      signals: 2,
      watchlist: 3,
      ready: 1,
      nearBreakout: 2,
      activeTradePlans: 2,
      openPositions: 2,
      closedTrades: 3
    });
    expect(dashboard.performance).toEqual({
      trades: 3,
      wins: 2,
      losses: 1,
      breakeven: 0,
      realizedPnl: 250,
      netExternalCapital: 30_000,
      realizedEquity: 30_250,
      winRate: 2 / 3,
      profitFactor: 2,
      averageR: 0.833,
      totalR: 2.5
    });
    expect(dashboard.watchlistPreview.map((item) => item.ticker)).toEqual(['BOX', 'DK']);
    expect(dashboard.openPositionsPreview.map((item) => item.ticker)).toEqual(['BOX', 'NVDA']);
    expect(dashboard.actions.nearBreakout.map((item) => item.ticker)).toEqual(['BOX', 'DK']);
    expect(dashboard.actions.ready.map((item) => item.ticker)).toEqual(['BOX']);
    expect(dashboard.actions.openPositions.map((item) => item.ticker)).toEqual(['BOX', 'NVDA']);
    expect(dashboard.actions.openPositions[0].stopDistance).toBeCloseTo((34 - 33.8) / 34);
  });

  it('filters account-owned operational counts for one account', () => {
    const getDashboard = createGetDashboard({
      repository: { readSnapshot: snapshot },
      getAnalytics: () => ({
        ...analytics,
        scope: { type: 'ACCOUNT', accountId: 'A1' },
        summary: { ...analytics.summary, trades: 1, wins: 1, losses: 0, totalPnl: 150 }
      }),
      getPortfolioEquity: () => ({
        ...portfolioEquity,
        scope: { type: 'ACCOUNT', accountId: 'A1' },
        accountId: 'A1',
        accountName: 'Account 1',
        accountCount: 1,
        netExternalCapital: 10_000,
        realizedPnl: 150,
        realizedEquity: 10_150
      }),
      now: () => new Date('2026-08-28T18:00:00.000Z')
    });

    const dashboard = getDashboard();

    expect(dashboard.account).toMatchObject({
      scope: { type: 'ACCOUNT', accountId: 'A1' },
      accountId: 'A1',
      realizedEquity: 10_150
    });
    expect(dashboard.pipeline).toMatchObject({
      activeTradePlans: 1,
      openPositions: 1,
      closedTrades: 1
    });
    expect(dashboard.actions.openPositions.map((item) => item.ticker)).toEqual(['BOX']);
  });
});
