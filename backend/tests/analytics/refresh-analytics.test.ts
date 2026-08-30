import { describe, expect, it, vi } from 'vitest';
import type { AnalyticsDto } from '@trading-cockpit/contracts';
import { createRefreshAnalytics } from '../../src/core/application/analytics/refresh-analytics';

function analyticsDto(): AnalyticsDto {
  return {
    generatedAt: '2026-08-28T16:00:00.000Z',
    available: true,
    summary: {
      trades: 1,
      wins: 1,
      losses: 0,
      breakeven: 0,
      winRate: 1,
      profitFactor: null,
      totalPnl: 150,
      averagePnl: 150,
      bestPnl: 150,
      grossProfit: 150,
      grossLoss: 0,
      worstPnl: 150,
      totalR: 1.5,
      averageR: 1.5,
      expectancyR: 1.5,
      averageWinnerR: 1.5,
      averageLoserR: 0,
      bestR: 1.5
    },
    byStrategy: [
      {
        strategyId: 'MOMENTUM_BREAKOUT',
        strategy: 'Momentum Breakout',
        trades: 1,
        wins: 1,
        winRate: 1,
        totalPnl: 150,
        averageR: 1.5,
        totalR: 1.5
      }
    ],
    byStrategyVersion: [
      {
        strategyId: 'MOMENTUM_BREAKOUT',
        strategy: 'Momentum Breakout',
        version: 'V1',
        trades: 1,
        wins: 1,
        winRate: 1,
        totalPnl: 150,
        averageR: 1.5,
        totalR: 1.5
      }
    ]
  };
}

describe('refresh Analytics', () => {
  it('projects the same backend-calculated Analytics result to Google Sheets', () => {
    const analytics = analyticsDto();
    const replace = vi.fn();
    const refreshAnalytics = createRefreshAnalytics({
      getAnalytics: () => analytics,
      projection: { replace }
    });

    const result = refreshAnalytics();

    expect(result).toBe(analytics);
    expect(replace).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith(analytics);
  });
});
