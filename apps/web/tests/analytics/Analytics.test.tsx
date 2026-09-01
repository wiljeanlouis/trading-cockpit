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
    realizedPnl: 150,
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
  byStrategyVersion: [],
  byAccount: [
    {
      accountId: 'A1',
      accountName: 'Main Account',
      trades: 1,
      wins: 1,
      losses: 0,
      breakeven: 0,
      winRate: 1,
      realizedPnl: 150,
      profitFactor: null,
      totalR: 1.5,
      averageR: 1.5
    }
  ]
};

describe('Analytics', () => {
  it('loads and refreshes directly from getAnalytics without materializing the sheet projection', async () => {
    const getAnalytics = vi.fn(async () => analytics);
    const getTradingAccounts = vi.fn(async () => ({
      accounts: [{ id: 'A1', name: 'Main Account', baseCurrency: 'CAD' }]
    }));
    render(<Analytics gateway={createGatewayStub({ getAnalytics, getTradingAccounts })} />);

    expect(await screen.findByRole('heading', { name: 'Analytics' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Account Scope/i })).toHaveValue('');
    expect(screen.getByRole('option', { name: 'A1 — Main Account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Performance by account')).toBeInTheDocument();
    expect(screen.getByText('Main Account')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => expect(getAnalytics).toHaveBeenCalledTimes(2));
    expect(getAnalytics).toHaveBeenCalledWith({ accountId: null, strategyId: null });
    expect(getTradingAccounts).toHaveBeenCalledTimes(2);
  });

  it('reloads Analytics with account and strategy filters through the gateway', async () => {
    const getAnalytics = vi.fn(async () => analytics);
    render(
      <Analytics
        gateway={createGatewayStub({
          getAnalytics,
          getTradingAccounts: vi.fn(async () => ({
            accounts: [{ id: 'A1', name: 'Main Account', baseCurrency: 'CAD' }]
          }))
        })}
      />
    );

    fireEvent.change(await screen.findByRole('combobox', { name: /Account Scope/i }), {
      target: { value: 'A1' }
    });
    await waitFor(() =>
      expect(getAnalytics).toHaveBeenLastCalledWith({ accountId: 'A1', strategyId: null })
    );

    fireEvent.change(screen.getByRole('combobox', { name: /^Strategy$/i }), {
      target: { value: 'MOMENTUM_BREAKOUT' }
    });
    await waitFor(() =>
      expect(getAnalytics).toHaveBeenLastCalledWith({
        accountId: 'A1',
        strategyId: 'MOMENTUM_BREAKOUT'
      })
    );
  });
});
