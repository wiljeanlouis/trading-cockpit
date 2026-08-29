import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
      signalPrice: 33.4,
      currentPrice: 34.82,
      momentumScore: 87,
      status: 'READY',
      setupStatus: 'VALID',
      breakoutLevel: 34.5,
      invalidationLevel: 32.8,
      earningsDate: '2026-09-10T04:00:00.000Z',
      eventRisk: 'CLEAR',
      notes: 'Strong volume confirmation'
    }
  ]
};

function gateway(getWatchlist: CockpitGateway['getWatchlist']): CockpitGateway {
  return {
    getWatchlist,
    getDashboardSummary: vi.fn(),
    getTradingAccounts: vi.fn(async () => ({
      accounts: [{ id: 'A1', name: 'Primary', baseCurrency: 'CAD' }]
    })),
    createTradePlan: vi.fn(),
    getTradePlans: vi.fn(),
    executeTradePlan: vi.fn(),
    getOpenPositions: vi.fn(),
    closePosition: vi.fn()
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
    const candidateRow = screen.getByRole('row', { name: /BOX/ });
    const cells = within(candidateRow).getAllByRole('cell');
    expect(cells[0]).toHaveTextContent('BOX');
    expect(cells[1]).toHaveTextContent('Momentum Breakout');
    expect(cells[2]).toHaveTextContent('2026');
    expect(cells[7]).toContainElement(screen.getByRole('button', { name: 'View BOX details' }));
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

  it('opens candidate details with persisted signal and trade context', async () => {
    render(<Watchlist gateway={gateway(vi.fn(async () => data))} />);
    fireEvent.click(await screen.findByRole('button', { name: 'View BOX details' }));

    expect(screen.getByRole('dialog', { name: 'BOX' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'BOX' })).toBeInTheDocument();
    expect(screen.getByText('33.4')).toBeInTheDocument();
    expect(screen.getByText('32.8')).toBeInTheDocument();
    expect(screen.getByText('Strong volume confirmation')).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Primary · A1 · CAD' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('creates a Trade Plan through the gateway, confirms it and refreshes Watchlist', async () => {
    const load = vi.fn(async () => data);
    const cockpit = gateway(load);
    cockpit.createTradePlan = vi.fn(async () => ({
      kind: 'created' as const,
      tradePlanId: 'TP-1',
      watchlistId: 'W1',
      ticker: 'BOX',
      accountId: 'A1',
      status: 'DRAFT'
    }));
    render(<Watchlist gateway={cockpit} />);
    fireEvent.click(await screen.findByRole('button', { name: 'View BOX details' }));
    await screen.findByRole('option', { name: 'Primary · A1 · CAD' });

    fireEvent.click(screen.getByRole('button', { name: 'Create Trade Plan' }));

    expect(await screen.findByText('Trade Plan TP-1 created for BOX in A1.')).toBeInTheDocument();
    expect(cockpit.createTradePlan).toHaveBeenCalledWith({ watchlistId: 'W1', accountId: 'A1' });
    expect(load).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Trade Plan Created' })).toBeDisabled();
  });

  it('keeps the candidate open and reports a backend creation failure', async () => {
    const cockpit = gateway(vi.fn(async () => data));
    cockpit.createTradePlan = vi.fn(async () => {
      throw new Error('Initial Funding absent pour le compte A1.');
    });
    render(<Watchlist gateway={cockpit} />);
    fireEvent.click(await screen.findByRole('button', { name: 'View BOX details' }));
    await screen.findByRole('option', { name: 'Primary · A1 · CAD' });

    fireEvent.click(screen.getByRole('button', { name: 'Create Trade Plan' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Initial Funding absent pour le compte A1.'
    );
    expect(screen.getByRole('heading', { name: 'BOX' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Trade Plan' })).toBeEnabled();
  });

  it('prevents creation when the persisted candidate has no invalidation level', async () => {
    const cockpit = gateway(
      vi.fn(async () => ({
        ...data,
        items: [{ ...data.items[0], invalidationLevel: null }]
      }))
    );
    render(<Watchlist gateway={cockpit} />);
    fireEvent.click(await screen.findByRole('button', { name: 'View BOX details' }));

    expect(screen.getByText(/Add an Invalidation Level/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Trade Plan' })).toBeDisabled();
  });
});
