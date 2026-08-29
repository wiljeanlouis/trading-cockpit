import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DashboardSummaryDto } from '@trading-cockpit/contracts';
import type { CockpitGateway } from '../../src/infrastructure/cockpit-gateway';
import { Dashboard } from '../../src/features/dashboard/Dashboard';

const summary: DashboardSummaryDto = {
  generatedAt: '2026-08-28T16:04:00.000Z',
  signals: 12,
  watchlist: 8,
  ready: 3,
  activeTradePlans: 2,
  openPositions: 1,
  closedTrades: 14
};

function gateway(getDashboardSummary: CockpitGateway['getDashboardSummary']): CockpitGateway {
  return {
    getDashboardSummary,
    getWatchlist: vi.fn(),
    getTradingAccounts: vi.fn(),
    createTradePlan: vi.fn(),
    getTradePlans: vi.fn(),
    executeTradePlan: vi.fn(),
    getOpenPositions: vi.fn(),
    closePosition: vi.fn()
  };
}

describe('Dashboard', () => {
  it('loads automatically and renders the backend summary', async () => {
    const load = vi.fn(async () => summary);
    render(<Dashboard gateway={gateway(load)} />);

    expect(screen.getByText('Loading cockpit data…')).toBeInTheDocument();
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('shows a useful error and permits retry', async () => {
    const load = vi
      .fn<CockpitGateway['getDashboardSummary']>()
      .mockRejectedValueOnce(new Error('Spreadsheet unavailable'))
      .mockResolvedValueOnce(summary);
    render(<Dashboard gateway={gateway(load)} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Spreadsheet unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('refreshes manually and keeps the current summary while loading', async () => {
    let resolveRefresh: ((value: DashboardSummaryDto) => void) | undefined;
    const load = vi
      .fn<CockpitGateway['getDashboardSummary']>()
      .mockResolvedValueOnce(summary)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
          })
      );
    render(<Dashboard gateway={gateway(load)} />);
    expect(await screen.findByText('12')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Refresh/ }));
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refreshing/ })).toBeDisabled();

    resolveRefresh?.({ ...summary, signals: 13 });
    await waitFor(() => expect(screen.getByText('13')).toBeInTheDocument());
  });
});
