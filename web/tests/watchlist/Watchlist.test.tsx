import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WatchlistDto } from '@trading-cockpit/contracts';
import type { CockpitGateway } from '../../src/infrastructure/cockpit-gateway';
import { Watchlist } from '../../src/features/watchlist/Watchlist';

const data: WatchlistDto = {
  generatedAt: '2026-08-28T16:04:00.000Z',
  items: [
    {
      id: 'W1',
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
    }
  ]
};

function gateway(getWatchlist: CockpitGateway['getWatchlist']): CockpitGateway {
  return {
    getWatchlist,
    getDashboardSummary: vi.fn()
  };
}

describe('Watchlist', () => {
  it('loads automatically and renders useful existing fields', async () => {
    const load = vi.fn(async () => data);
    render(<Watchlist gateway={gateway(load)} />);

    expect(screen.getByText('Loading watchlist…')).toBeInTheDocument();
    expect(await screen.findByText('BOX')).toBeInTheDocument();
    expect(screen.getByText('Momentum Breakout')).toBeInTheDocument();
    expect(screen.getByText('34.82')).toBeInTheDocument();
    expect(screen.getByText('87')).toBeInTheDocument();
    expect(screen.getByText('READY')).toBeInTheDocument();
    expect(load).toHaveBeenCalledOnce();
  });

  it('renders a dedicated empty state', async () => {
    render(<Watchlist gateway={gateway(vi.fn(async () => ({ ...data, items: [] })))} />);
    expect(await screen.findByText('No watchlist candidates')).toBeInTheDocument();
  });

  it('shows an error and retries', async () => {
    const load = vi
      .fn<CockpitGateway['getWatchlist']>()
      .mockRejectedValueOnce(new Error('Watchlist unavailable'))
      .mockResolvedValueOnce(data);
    render(<Watchlist gateway={gateway(load)} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Watchlist unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('BOX')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('refreshes manually while preserving current rows', async () => {
    let resolveRefresh: ((value: WatchlistDto) => void) | undefined;
    const load = vi
      .fn<CockpitGateway['getWatchlist']>()
      .mockResolvedValueOnce(data)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
          })
      );
    render(<Watchlist gateway={gateway(load)} />);
    expect(await screen.findByText('BOX')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(screen.getByText('BOX')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refreshing' })).toBeDisabled();

    resolveRefresh?.({ ...data, items: [{ ...data.items[0], momentumScore: 91 }] });
    await waitFor(() => expect(screen.getByText('91')).toBeInTheDocument());
  });
});
