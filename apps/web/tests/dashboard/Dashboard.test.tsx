import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
    accountName: 'All Accounts',
    accountEquity: 20_000,
    realizedEquity: 20_000,
    netExternalCapital: 18_713,
    realizedPnl: 1_287,
    accountCount: 2,
    scope: { type: 'ALL' },
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
    losses: 4,
    breakeven: 1,
    realizedPnl: 1287,
    netExternalCapital: 18_713,
    realizedEquity: 20_000,
    profitFactor: 2.14,
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
    const getTradingAccounts = vi.fn(async () => ({
      accounts: [
        { id: 'A1', name: 'Main Account', baseCurrency: 'CAD', riskPercentPerTrade: 0.005 },
        { id: 'A2', name: 'Secondary Account', baseCurrency: 'CAD', riskPercentPerTrade: 0.005 }
      ]
    }));
    render(<Dashboard gateway={createGatewayStub({ getDashboard: load, getTradingAccounts })} />);

    expect(screen.getByText('Loading cockpit data…')).toBeInTheDocument();
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Account Scope/i })).toHaveValue('');
    expect(screen.getByRole('option', { name: 'A1 — Main Account' })).toBeInTheDocument();
    expect(within(screen.getByLabelText('Discovery')).getByText('Discovery')).toBeInTheDocument();
    expect(screen.queryByText('Workflow Pulse')).not.toBeInTheDocument();
    expect(screen.getByText('Account scope')).toBeInTheDocument();
    expect(screen.getByText('Scoped Performance')).toBeInTheDocument();
    expect(screen.getByText('Calculated for the selected account scope')).toBeInTheDocument();
    expect(screen.queryByText('Candidates ready to plan')).not.toBeInTheDocument();
    expect(screen.queryByText('Candidates approaching trigger')).not.toBeInTheDocument();
    expect(screen.queryByText('Open Position Actions')).not.toBeInTheDocument();
    expect(screen.getAllByText('Realized Equity')).toHaveLength(1);
    expect(screen.getAllByText('BOX').length).toBeGreaterThan(0);
    expect(screen.getByText(/Entry/)).toHaveTextContent('Stop');
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
    expect(load).toHaveBeenCalledWith({ accountId: null });
    expect(getTradingAccounts).toHaveBeenCalledTimes(1);
  });

  it('shows Discovery and Account Scope as sibling Dashboard sections', async () => {
    render(
      <Dashboard gateway={createGatewayStub({ getDashboard: vi.fn(async () => dashboard) })} />
    );

    const discovery = await screen.findByLabelText('Discovery');
    const accountScope = screen.getByLabelText('Account-scoped Dashboard');

    expect(within(discovery).getByText('Signals')).toBeInTheDocument();
    expect(within(discovery).getByText('Watchlist')).toBeInTheDocument();
    expect(discovery).not.toContainElement(accountScope);
    expect(within(accountScope).getByText('Account scope')).toBeInTheDocument();
    expect(within(accountScope).getByText('Trade plans')).toBeInTheDocument();
    expect(within(accountScope).getByText('Open positions')).toBeInTheDocument();
    expect(within(accountScope).getByText('Closed trades')).toBeInTheDocument();
    expect(screen.queryByText('Workflow Pulse')).not.toBeInTheDocument();
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

  it('reloads Dashboard when an individual account is selected and when switching back to All Accounts', async () => {
    const accountDashboard: DashboardDto = {
      ...dashboard,
      account: {
        ...dashboard.account,
        accountName: 'Main Account',
        accountId: 'A1',
        accountCount: 1,
        scope: { type: 'ACCOUNT', accountId: 'A1' }
      },
      summary: { ...dashboard.summary, activeTradePlans: 1 }
    };
    const load = vi.fn(async (query?: { accountId?: string | null }) =>
      query?.accountId === 'A1' ? accountDashboard : dashboard
    );
    render(
      <Dashboard
        gateway={createGatewayStub({
          getDashboard: load,
          getTradingAccounts: vi.fn(async () => ({
            accounts: [
              { id: 'A1', name: 'Main Account', baseCurrency: 'CAD', riskPercentPerTrade: 0.005 }
            ]
          }))
        })}
      />
    );

    const selector = await screen.findByRole('combobox', { name: /Account Scope/i });
    fireEvent.change(selector, { target: { value: 'A1' } });
    await waitFor(() => expect(load).toHaveBeenLastCalledWith({ accountId: 'A1' }));

    fireEvent.change(selector, { target: { value: '' } });
    await waitFor(() => expect(load).toHaveBeenLastCalledWith({ accountId: null }));
  });
});
