import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AnalyticsDto } from '@trading-cockpit/contracts';
import { Analytics } from '../../src/features/analytics/Analytics';
import { createGatewayStub } from '../support/cockpit-gateway';

const analytics: AnalyticsDto = {
  generatedAt: '2026-08-28T16:04:00.000Z',
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
  byStrategy: [],
  byStrategyVersion: []
};

describe('Analytics', () => {
  it('loads and refreshes directly from getAnalytics without materializing the sheet projection', async () => {
    const getAnalytics = vi.fn(async () => analytics);
    render(<Analytics gateway={createGatewayStub({ getAnalytics })} />);

    expect(await screen.findByText('Trades')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => expect(getAnalytics).toHaveBeenCalledTimes(2));
  });
});
