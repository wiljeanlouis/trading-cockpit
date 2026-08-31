import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MomentumRankingDto } from '@trading-cockpit/contracts';
import { Discovery } from '../../src/features/discovery/Discovery';
import { createGatewayStub } from '../support/cockpit-gateway';

const ranking: MomentumRankingDto = {
  generatedAt: '2026-08-28T16:04:00.000Z',
  items: [
    {
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyName: 'Momentum Breakout',
      strategyVersion: '1.0',
      signalDate: '2026-08-28',
      ticker: 'NVDA',
      company: 'NVIDIA Corp',
      sector: 'Technology',
      price: 217.55,
      high52: 220,
      high52Score: 20,
      relativeVolume: 1.8,
      relativeVolumeScore: 18,
      performanceMonth: 0.12,
      performanceScore: 16,
      rsi: 63,
      rsiScore: 14,
      sma20: 1.03,
      sma20Score: 18,
      momentumScore: 86,
      reviewStatus: 'READY',
      watchlistStatus: null
    },
    {
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyName: 'Momentum Breakout',
      strategyVersion: '1.0',
      signalDate: '2026-08-27',
      ticker: 'BOX',
      company: 'Box, Inc.',
      sector: 'Technology',
      price: 34.98,
      high52: 36,
      high52Score: 18,
      relativeVolume: 1.5,
      relativeVolumeScore: 16,
      performanceMonth: 0.09,
      performanceScore: 14,
      rsi: 59,
      rsiScore: 13,
      sma20: 1.02,
      sma20Score: 17,
      momentumScore: 87,
      reviewStatus: 'WATCH',
      watchlistStatus: 'PLANNED'
    }
  ]
};

describe('Discovery', () => {
  it('loads ranked Momentum candidates automatically', async () => {
    const load = vi.fn(async () => ranking);
    render(<Discovery gateway={createGatewayStub({ getMomentumRanking: load })} />);

    expect(screen.getByText('Loading ranked candidates…')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Discovery' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Momentum Breakout' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByText('Quality Dip · later')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Rank/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Score/ })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /Strategy/ })).not.toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('NVDA')).toBeInTheDocument();
    expect(screen.getByText('NVIDIA Corp')).toBeInTheDocument();
    expect(screen.getByText('217.55')).toBeInTheDocument();
    expect(screen.getByText('1.8')).toBeInTheDocument();
    expect(screen.getByText('86')).toBeInTheDocument();
    expect(load).toHaveBeenCalledOnce();
  });

  it('keeps Refresh Signals and Refresh Ranking as distinct backend actions', async () => {
    const load = vi.fn(async () => ranking);
    const cockpit = createGatewayStub({
      getMomentumRanking: load,
      refreshFinviz: vi.fn(async () => 12),
      refreshMomentumRanking: vi.fn(async () => {})
    });
    render(<Discovery gateway={cockpit} />);
    await screen.findByText('NVDA');

    fireEvent.click(screen.getByRole('button', { name: 'Refresh Signals' }));
    expect(await screen.findByText(/12 Finviz signals refreshed/)).toBeInTheDocument();
    expect(cockpit.refreshFinviz).toHaveBeenCalledOnce();
    expect(cockpit.refreshMomentumRanking).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh Ranking' }));
    expect(
      await screen.findByText('Momentum Breakout candidates refreshed from archived signals.')
    ).toBeInTheDocument();
    expect(cockpit.refreshMomentumRanking).toHaveBeenCalledOnce();
  });

  it('adds a ranked candidate to Watchlist through the gateway identity command', async () => {
    const load = vi.fn(async () => ranking);
    const cockpit = createGatewayStub({
      getMomentumRanking: load,
      addMomentumCandidateToWatchlist: vi.fn(async () => ({
        kind: 'added' as const,
        watchlistId: 'WL-NVDA',
        ticker: 'NVDA',
        status: 'WATCHING'
      }))
    });
    render(<Discovery gateway={cockpit} />);
    const row = await screen.findByRole('row', { name: /NVDA/ });

    fireEvent.click(within(row).getByRole('button', { name: 'Add NVDA to Watchlist' }));

    expect(await screen.findByText('NVDA added to Watchlist as WATCHING.')).toBeInTheDocument();
    expect(cockpit.addMomentumCandidateToWatchlist).toHaveBeenCalledWith({
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyVersion: '1.0',
      signalDate: '2026-08-28',
      ticker: 'NVDA'
    });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('shows already watched candidates as non-addable and opens candidate details', async () => {
    render(
      <Discovery gateway={createGatewayStub({ getMomentumRanking: vi.fn(async () => ranking) })} />
    );
    const row = await screen.findByRole('row', { name: /BOX/ });

    expect(within(row).getByRole('button', { name: 'Add BOX to Watchlist' })).toBeDisabled();
    fireEvent.click(within(row).getByRole('button', { name: 'View BOX Momentum details' }));

    const dialog = screen.getByRole('dialog', { name: 'BOX' });
    expect(within(dialog).getByRole('heading', { name: 'Candidate' })).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Ranking inputs' })).toBeInTheDocument();
    expect(within(dialog).getByText('PLANNED')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
