import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OpenPositionsDto } from '@trading-cockpit/contracts';
import type { CockpitGateway } from '../../src/infrastructure/cockpit-gateway';
import { Positions } from '../../src/features/positions/Positions';

const data: OpenPositionsDto = {
  generatedAt: '2026-08-28T16:00:00.000Z',
  items: [
    {
      id: 'P-1',
      accountId: 'A1',
      tradePlanId: 'TP-1',
      watchlistId: 'WL-1',
      ticker: 'BOX',
      strategyId: 'BREAKOUT',
      strategyName: 'Breakout',
      strategyVersion: 'V1',
      openedAt: '2026-08-28T14:00:00.000Z',
      plannedEntry: 35,
      actualEntry: 35,
      plannedQuantity: 45,
      actualQuantity: 45,
      initialStop: 32.8,
      currentStop: 33.5,
      target: 40,
      plannedMaxRisk: 100,
      plannedRiskReward: 2.27,
      currentPrice: 36,
      unrealizedPnl: 45,
      unrealizedPnlPercent: 0.0286,
      status: 'OPEN',
      notes: 'Protect capital'
    }
  ]
};

function gateway(getOpenPositions: CockpitGateway['getOpenPositions']): CockpitGateway {
  return {
    getOpenPositions,
    closePosition: vi.fn(),
    getJournal: vi.fn(),
    updateTradePlanPlanning: vi.fn(),
    getDashboardSummary: vi.fn(),
    getWatchlist: vi.fn(),
    getTradingAccounts: vi.fn(),
    createTradePlan: vi.fn(),
    getTradePlans: vi.fn(),
    executeTradePlan: vi.fn()
  };
}

describe('Positions', () => {
  it('loads automatically and displays backend-provided open Position values', async () => {
    const load = vi.fn(async () => data);
    render(<Positions gateway={gateway(load)} />);
    expect(screen.getByText('Loading Positions…')).toBeInTheDocument();
    const row = await screen.findByRole('row', { name: /BOX/ });
    const cells = within(row).getAllByRole('cell');
    expect(cells[1]).toHaveTextContent('A1');
    expect(cells[4]).toHaveTextContent('45');
    expect(cells[5]).toHaveTextContent('35');
    expect(cells[6]).toHaveTextContent('33.5');
    expect(cells[8]).toHaveTextContent('+45');
    expect(load).toHaveBeenCalledOnce();
  });

  it('shows detailed planned, actual, stop, and indicative values in a modal', async () => {
    render(<Positions gateway={gateway(vi.fn(async () => data))} />);
    fireEvent.click(await screen.findByRole('button', { name: 'View BOX Position' }));
    const dialog = screen.getByRole('dialog', { name: 'BOX' });
    expect(within(dialog).getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Execution & prices' })).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Risk & performance' })).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Planned entry');
    expect(dialog).toHaveTextContent('Actual entry');
    expect(dialog).toHaveTextContent('Initial stop');
    expect(dialog).toHaveTextContent('Current stop');
    expect(dialog).toHaveTextContent('GOOGLEFINANCE display value');
    expect(dialog).toHaveTextContent('Protect capital');
  });

  it('requires an explicit valid exit, delegates closure, and reloads backend state', async () => {
    const load = vi
      .fn<CockpitGateway['getOpenPositions']>()
      .mockResolvedValueOnce(data)
      .mockResolvedValueOnce({ ...data, items: [] });
    const cockpit = gateway(load);
    cockpit.closePosition = vi.fn(async () => ({
      positionId: 'P-1',
      accountId: 'A1',
      ticker: 'BOX',
      status: 'CLOSED',
      closedAt: '2026-08-28T18:00:00.000Z',
      exitPrice: 38,
      realizedPnl: 135,
      journalCreated: true
    }));
    render(<Positions gateway={cockpit} />);
    fireEvent.click(await screen.findByRole('button', { name: 'View BOX Position' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close Position' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Close' }));
    expect(screen.getByRole('alert')).toHaveTextContent('greater than 0');
    expect(cockpit.closePosition).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Actual exit price'), { target: { value: '38' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Close' }));
    expect(await screen.findByRole('status')).toHaveTextContent('BOX closed at 38');
    expect(screen.getByRole('status')).toHaveTextContent('Journal created');
    expect(cockpit.closePosition).toHaveBeenCalledWith({ positionId: 'P-1', exitPrice: 38 });
    expect(load).toHaveBeenCalledTimes(2);
    expect(screen.getByText('No open Positions')).toBeInTheDocument();
  });

  it('keeps the Position open when backend closure fails', async () => {
    const cockpit = gateway(vi.fn(async () => data));
    cockpit.closePosition = vi.fn(async () => {
      throw new Error("BOX n'est pas une position OPEN.");
    });
    render(<Positions gateway={cockpit} />);
    fireEvent.click(await screen.findByRole('button', { name: 'View BOX Position' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close Position' }));
    fireEvent.change(screen.getByLabelText('Actual exit price'), { target: { value: '38' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Close' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("BOX n'est pas une position OPEN.");
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('supports errors, retry, empty data, and manual refresh without dropping prior rows', async () => {
    let resolveRefresh: ((value: OpenPositionsDto) => void) | undefined;
    const load = vi
      .fn<CockpitGateway['getOpenPositions']>()
      .mockRejectedValueOnce(new Error('Positions unavailable'))
      .mockResolvedValueOnce(data)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
          })
      );
    render(<Positions gateway={gateway(load)} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('BOX')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(screen.getByText('BOX')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refreshing' })).toBeDisabled();
    resolveRefresh?.({ ...data, items: [] });
    await waitFor(() => expect(screen.getByText('No open Positions')).toBeInTheDocument());
  });
});
