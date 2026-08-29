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
    createTradePlan: vi.fn(),
    executeTradePlan: vi.fn(),
    getOpenPositions: vi.fn(),
    closePosition: vi.fn()
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
    expect(screen.getByRole('button', { name: 'Execute Trade Plan' })).toBeInTheDocument();

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

  it('requires confirmation, executes through the gateway, and refreshes backend state', async () => {
    const load = vi
      .fn<CockpitGateway['getTradePlans']>()
      .mockResolvedValueOnce(data)
      .mockResolvedValueOnce({
        ...data,
        items: [{ ...data.items[0], status: 'EXECUTED' }]
      });
    const cockpit = gateway(load);
    cockpit.executeTradePlan = vi.fn(async () => ({
      kind: 'opened' as const,
      positionId: 'P-1',
      tradePlanId: 'TP-1',
      accountId: 'A1',
      ticker: 'BOX',
      openedAt: '2026-08-28T18:00:00.000Z',
      actualEntry: 35,
      actualQuantity: 45,
      positionStatus: 'OPEN'
    }));
    render(<TradePlans gateway={cockpit} />);
    fireEvent.click(await screen.findByRole('button', { name: 'View BOX Trade Plan' }));

    fireEvent.click(screen.getByRole('button', { name: 'Execute Trade Plan' }));
    expect(screen.getByText('Confirm Position creation')).toBeInTheDocument();
    expect(cockpit.executeTradePlan).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm & Create Position' }));

    expect(
      await screen.findByText('Position P-1 created for BOX: 45 shares at 35.')
    ).toBeInTheDocument();
    expect(cockpit.executeTradePlan).toHaveBeenCalledWith({ tradePlanId: 'TP-1' });
    expect(load).toHaveBeenCalledTimes(2);
    expect(screen.getAllByText('EXECUTED')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Execute Trade Plan' })).not.toBeInTheDocument();
  });

  it('shows backend validation errors without pretending execution succeeded', async () => {
    const cockpit = gateway(vi.fn(async () => data));
    cockpit.executeTradePlan = vi.fn(async () => {
      throw new Error("BOX n'a pas d'Entry Price.");
    });
    render(<TradePlans gateway={cockpit} />);
    fireEvent.click(await screen.findByRole('button', { name: 'View BOX Trade Plan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Execute Trade Plan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm & Create Position' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("BOX n'a pas d'Entry Price.");
    expect(screen.queryByText(/Position .* created/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm & Create Position' })).toBeEnabled();
  });

  it('does not expose execution, edit, or cancel actions for a terminal plan', async () => {
    render(
      <TradePlans
        gateway={gateway(
          vi.fn(async () => ({
            ...data,
            items: [{ ...data.items[0], status: 'CANCELLED' }]
          }))
        )}
      />
    );
    fireEvent.click(await screen.findByRole('button', { name: 'View BOX Trade Plan' }));

    expect(screen.queryByRole('button', { name: 'Execute Trade Plan' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });
});
