import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TradePlansDto } from '@trading-cockpit/contracts';
import type { CockpitGateway } from '../../src/infrastructure/cockpit-gateway';
import { TradePlans } from '../../src/features/trade-plans/TradePlans';

const data: TradePlansDto = {
  generatedAt: '2026-08-28T16:04:00.000Z',
  items: [
    {
      id: 'TP-1',
      watchlistId: 'WL-1',
      accountId: 'A1',
      ticker: 'BOX',
      strategyId: 'BREAKOUT',
      strategyName: 'Breakout',
      strategyVersion: 'V1',
      signalDate: '2026-08-27T04:00:00.000Z',
      signalPrice: 33,
      referencePrice: 34,
      momentumScore: 87,
      setupStatus: 'CONFIRMED',
      breakoutLevel: 34.5,
      invalidationLevel: 32.8,
      eventRisk: 'CLEAR',
      createdAt: '2026-08-28T14:00:00.000Z',
      entryType: 'BREAKOUT',
      entryPrice: 35,
      stopPrice: 32.8,
      targetPrice: 40,
      riskPerShare: 2.2,
      rewardPerShare: 5,
      riskReward: 2.27,
      accountEquity: 10_000,
      riskPercent: 0.01,
      maxRisk: 100,
      positionSize: 45,
      positionValue: 1575,
      status: 'READY',
      notes: 'Wait for volume'
    }
  ]
};

function gateway(getTradePlans: CockpitGateway['getTradePlans']): CockpitGateway {
  return {
    getTradePlans,
    getDashboardSummary: vi.fn(),
    getWatchlist: vi.fn(),
    getTradingAccounts: vi.fn(),
    createTradePlan: vi.fn()
  };
}

describe('Trade Plans', () => {
  it('loads automatically and renders persisted planning values in aligned columns', async () => {
    const load = vi.fn(async () => data);
    render(<TradePlans gateway={gateway(load)} />);

    expect(screen.getByText('Loading Trade Plans…')).toBeInTheDocument();
    const row = await screen.findByRole('row', { name: /BOX/ });
    const cells = within(row).getAllByRole('cell');
    expect(cells[0]).toHaveTextContent('BOX');
    expect(cells[1]).toHaveTextContent('A1');
    expect(cells[4]).toHaveTextContent('35');
    expect(cells[7]).toHaveTextContent('100');
    expect(cells[9]).toHaveTextContent('READY');
    expect(load).toHaveBeenCalledOnce();
  });

  it('opens a read-only detail modal using backend snapshots', async () => {
    render(<TradePlans gateway={gateway(vi.fn(async () => data))} />);
    fireEvent.click(await screen.findByRole('button', { name: 'View BOX Trade Plan' }));

    const dialog = screen.getByRole('dialog', { name: 'BOX' });
    expect(dialog).toHaveTextContent('Snapshot, not a live quote');
    expect(dialog).toHaveTextContent('2.27');
    expect(dialog).toHaveTextContent('1,575');
    expect(dialog).toHaveTextContent('Wait for volume');
    expect(screen.queryByRole('button', { name: /execute/i })).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders empty, error/retry, and refresh states', async () => {
    const load = vi
      .fn<CockpitGateway['getTradePlans']>()
      .mockRejectedValueOnce(new Error('Trade Plans unavailable'))
      .mockResolvedValueOnce({ ...data, items: [] })
      .mockResolvedValueOnce(data);
    render(<TradePlans gateway={gateway(load)} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Trade Plans unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No Trade Plans')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText('BOX')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('keeps the last successful rows visible during manual refresh', async () => {
    let resolveRefresh: ((value: TradePlansDto) => void) | undefined;
    const load = vi
      .fn<CockpitGateway['getTradePlans']>()
      .mockResolvedValueOnce(data)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
          })
      );
    render(<TradePlans gateway={gateway(load)} />);
    expect(await screen.findByText('BOX')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(screen.getByText('BOX')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refreshing' })).toBeDisabled();
    resolveRefresh?.({ ...data, items: [{ ...data.items[0], status: 'EXECUTED' }] });
    await waitFor(() => expect(screen.getByText('EXECUTED')).toBeInTheDocument());
  });
});
