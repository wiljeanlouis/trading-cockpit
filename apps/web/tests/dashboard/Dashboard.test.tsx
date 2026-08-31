import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DashboardDto } from '@trading-cockpit/contracts';
import { Dashboard } from '../../src/features/dashboard/Dashboard';
import { createGatewayStub } from '../support/cockpit-gateway';

const dashboard: DashboardDto = {
  generatedAt: '2026-08-28T16:04:00.000Z',
  summary: {
    generatedAt: '2026-08-28T16:04:00.000Z',
    signals: 12,
    watchlist: 8,
    ready: 3,
    activeTradePlans: 2,
    openPositions: 1,
    closedTrades: 14
  },
  account: {
    accountName: 'Trading',
    accountEquity: 20_000,
    defaultRiskPercent: 0.005,
    maxPositionPercent: 0.1,
    currency: 'CAD'
  },
  pipeline: {
    signals: 12,
    watchlist: 8,
    ready: 3,
    nearBreakout: 2,
    activeTradePlans: 2,
    openPositions: 1,
    closedTrades: 14
  },
  performance: {
    trades: 14,
    wins: 9,
    realizedPnl: 1287,
    winRate: 0.64,
    averageR: 1.3,
    totalR: 18.2
  },
  topMomentum: [
    {
      rank: 1,
      ticker: 'BOX',
      score: 87,
      price: 34.98,
      high52: 0.01,
      relativeVolume: 1.5,
      rsi: 61,
      reviewStatus: 'REVIEW'
    }
  ],
  watchlistPreview: [
    {
      ticker: 'BOX',
      currentPrice: 34.98,
      signalPrice: 33.4,
      changeSinceSignal: 0.04,
      breakoutLevel: 35,
      distanceToBreakout: -0.01,
      setupStatus: 'CONFIRMED',
      status: 'READY'
    }
  ],
  openPositionsPreview: [
    {
      ticker: 'NVDA',
      actualEntry: 200,
      currentPrice: 217.55,
      currentStop: 210,
      target: 240,
      actualQuantity: 5,
      unrealizedPnl: 87.75,
      unrealizedPnlPercent: 0.087
    }
  ],
  actions: {
    nearBreakout: [
      {
        ticker: 'BOX',
        distance: -0.01,
        currentPrice: 34.98,
        breakoutLevel: 35,
        setupStatus: 'CONFIRMED'
      }
    ],
    ready: [
      {
        ticker: 'BOX',
        currentPrice: 34.98,
        breakoutLevel: 35,
        setupStatus: 'CONFIRMED'
      }
    ],
    openPositions: [
      {
        ticker: 'NVDA',
        actualEntry: 200,
        currentPrice: 217.55,
        currentStop: 210,
        unrealizedPnlPercent: 0.087,
        stopDistance: 0.035
      }
    ]
  }
};

describe('Dashboard', () => {
  it('loads automatically and renders the backend Dashboard DTO', async () => {
    const load = vi.fn(async () => dashboard);
    render(<Dashboard gateway={createGatewayStub({ getDashboard: load })} />);

    expect(screen.getByText('Loading cockpit data…')).toBeInTheDocument();
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('Action Required')).toBeInTheDocument();
    expect(screen.getAllByText('BOX').length).toBeGreaterThan(0);
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('shows a useful error and permits retry', async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error('Spreadsheet unavailable'))
      .mockResolvedValueOnce(dashboard);
    render(<Dashboard gateway={createGatewayStub({ getDashboard: load })} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Spreadsheet unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('refreshes manually and keeps the current dashboard while loading', async () => {
    let resolveRefresh: ((value: DashboardDto) => void) | undefined;
    const load = vi
      .fn()
      .mockResolvedValueOnce(dashboard)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
          })
      );
    render(<Dashboard gateway={createGatewayStub({ getDashboard: load })} />);
    expect(await screen.findByText('12')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Refresh/ }));
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refreshing/ })).toBeDisabled();

    resolveRefresh?.({
      ...dashboard,
      generatedAt: dashboard.generatedAt,
      summary: { ...dashboard.summary, signals: 13 }
    });
    await waitFor(() => expect(screen.getByText('13')).toBeInTheDocument());
  });
});
