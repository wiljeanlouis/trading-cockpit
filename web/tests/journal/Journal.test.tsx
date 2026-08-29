import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { JournalDto, JournalItemDto } from '@trading-cockpit/contracts';
import type { CockpitGateway } from '../../src/infrastructure/cockpit-gateway';
import { Journal } from '../../src/features/journal/Journal';

const win: JournalItemDto = {
  id: 'J-1',
  positionId: 'P-1',
  accountId: 'A1',
  tradePlanId: 'TP-1',
  watchlistId: 'WL-1',
  strategyId: 'BREAKOUT',
  strategyName: 'Breakout',
  strategyVersion: 'V1',
  ticker: 'BOX',
  openedAt: '2026-08-20T14:00:00.000Z',
  closedAt: '2026-08-27T15:00:00.000Z',
  plannedEntry: 33,
  actualEntry: 33.1,
  exitPrice: 36.5,
  quantity: 40,
  initialStop: 31,
  target: 38,
  plannedMaxRisk: 84,
  plannedRiskReward: 2.38,
  realizedPnl: 136,
  returnPercent: 0.1027,
  rMultiple: 1.619,
  outcome: 'WIN',
  exitReason: 'MANUAL',
  executionNotes: 'Good execution',
  lessonsLearned: 'Respect the setup',
  followedPlan: 'YES'
};
const loss: JournalItemDto = {
  ...win,
  id: 'J-2',
  positionId: 'P-2',
  tradePlanId: 'TP-2',
  watchlistId: 'WL-2',
  accountId: 'A2',
  ticker: 'DK',
  strategyId: 'PULLBACK',
  strategyName: 'Pullback',
  realizedPnl: -50,
  returnPercent: -0.03,
  rMultiple: -0.5,
  outcome: 'LOSS',
  exitReason: 'STOP'
};
const data: JournalDto = { generatedAt: '2026-08-28T16:00:00.000Z', items: [win, loss] };

function gateway(getJournal: CockpitGateway['getJournal']): CockpitGateway {
  return {
    getJournal,
    getDashboardSummary: vi.fn(),
    getWatchlist: vi.fn(),
    getTradingAccounts: vi.fn(),
    createTradePlan: vi.fn(),
    getTradePlans: vi.fn(),
    executeTradePlan: vi.fn(),
    getOpenPositions: vi.fn(),
    closePosition: vi.fn(),
    updateTradePlanPlanning: vi.fn()
  };
}

describe('Journal', () => {
  it('loads automatically and renders persisted realized outcomes', async () => {
    const load = vi.fn(async () => data);
    render(<Journal gateway={gateway(load)} />);
    expect(screen.getByText('Loading Journal…')).toBeInTheDocument();
    const boxRow = await screen.findByRole('row', { name: /BOX/ });
    const cells = within(boxRow).getAllByRole('cell');
    expect(cells[1]).toHaveTextContent('A1');
    expect(cells[8]).toHaveTextContent('+136');
    expect(cells[9]).toHaveTextContent('1.62 R');
    expect(cells[10]).toHaveTextContent('WIN');
    const lossRow = screen.getByRole('row', { name: /DK/ });
    expect(within(lossRow).getAllByRole('cell')[8]).toHaveTextContent('−50');
    expect(load).toHaveBeenCalledOnce();
  });

  it('opens a read-only lifecycle detail with backend-provided review fields', async () => {
    render(<Journal gateway={gateway(vi.fn(async () => data))} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Review BOX Journal entry' }));
    const dialog = screen.getByRole('dialog', { name: 'BOX' });
    expect(within(dialog).getByRole('heading', { name: 'Trade context' })).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Execution & prices' })).toBeInTheDocument();
    expect(
      within(dialog).getByRole('heading', { name: 'Outcome & performance' })
    ).toBeInTheDocument();
    expect(dialog).toHaveTextContent('WL-1');
    expect(dialog).toHaveTextContent('TP-1');
    expect(dialog).toHaveTextContent('P-1');
    expect(dialog).toHaveTextContent('Actual entry');
    expect(dialog).toHaveTextContent('Actual exit');
    expect(dialog).toHaveTextContent('MANUAL');
    expect(dialog).toHaveTextContent('Respect the setup');
    expect(screen.queryByRole('button', { name: /edit|delete/i })).not.toBeInTheDocument();
  });

  it('filters the loaded projection by ticker, account, strategy and outcome', async () => {
    render(<Journal gateway={gateway(vi.fn(async () => data))} />);
    await screen.findByText('BOX');
    fireEvent.change(screen.getByPlaceholderText('Search ticker'), { target: { value: 'bo' } });
    expect(screen.getByText('BOX')).toBeInTheDocument();
    expect(screen.queryByText('DK')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    fireEvent.change(screen.getByLabelText('Outcome'), { target: { value: 'LOSS' } });
    expect(screen.getByText('DK')).toBeInTheDocument();
    expect(screen.queryByText('BOX')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Account'), { target: { value: 'A1' } });
    expect(screen.getByText('No matching trades')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    fireEvent.change(screen.getByLabelText('Strategy'), { target: { value: 'Breakout' } });
    expect(screen.getByText('BOX')).toBeInTheDocument();
    expect(screen.queryByText('DK')).not.toBeInTheDocument();
  });

  it('supports error/retry, empty and non-destructive manual refresh states', async () => {
    let resolveRefresh: ((value: JournalDto) => void) | undefined;
    const load = vi
      .fn<CockpitGateway['getJournal']>()
      .mockRejectedValueOnce(new Error('Journal unavailable'))
      .mockResolvedValueOnce(data)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
          })
      );
    render(<Journal gateway={gateway(load)} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('BOX')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(screen.getByText('BOX')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refreshing' })).toBeDisabled();
    resolveRefresh?.({ ...data, items: [] });
    await waitFor(() => expect(screen.getByText('No completed trades')).toBeInTheDocument());
  });
});
