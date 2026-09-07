import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DiscoveryDto } from '@trading-cockpit/contracts';
import { Discovery } from '../../src/features/discovery/Discovery';
import { createGatewayStub } from '../support/cockpit-gateway';

const discovery: DiscoveryDto = {
  generatedAt: '2026-08-28T16:04:00.000Z',
  strategies: [
    {
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyName: 'Momentum Breakout',
      strategyVersion: '1.0',
      screener: 'FINVIZ'
    }
  ],
  items: [
    {
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyName: 'Momentum Breakout',
      strategyVersion: '1.0',
      signalDate: '2026-08-28',
      detectedAt: '2026-08-28T14:30:00.000Z',
      ticker: 'NVDA',
      company: 'NVIDIA Corp',
      sector: 'Technology',
      industry: null,
      country: null,
      marketCap: null,
      volume: null,
      price: 217.55,
      change: null,
      averageVolume: null,
      relativeVolume: 1.8,
      rsi: 63,
      high52: 220,
      performanceWeek: null,
      performanceMonth: 0.12,
      earningsDate: null,
      attributes: {},
      watchlistStatus: null
    },
    {
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyName: 'Momentum Breakout',
      strategyVersion: '1.0',
      signalDate: '2026-08-27',
      detectedAt: '2026-08-27T14:30:00.000Z',
      ticker: 'BOX',
      company: 'Box, Inc.',
      sector: 'Technology',
      industry: null,
      country: null,
      marketCap: null,
      volume: null,
      price: 34.98,
      change: null,
      averageVolume: null,
      relativeVolume: 1.5,
      rsi: 59,
      high52: 36,
      performanceWeek: null,
      performanceMonth: 0.09,
      earningsDate: null,
      attributes: {},
      watchlistStatus: 'PLANNED'
    }
  ]
};

describe('Discovery', () => {
  it('loads Discovery candidates automatically', async () => {
    const load = vi.fn(async () => discovery);
    render(<Discovery gateway={createGatewayStub({ getDiscovery: load })} />);

    expect(screen.getByText('Loading Discovery candidates…')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Discovery' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Strategy/i })).toHaveValue('ALL');
    expect(screen.getByRole('option', { name: 'Momentum Breakout · 1.0' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Ticker/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Strategy/ })).toBeInTheDocument();
    expect(screen.getByText('NVDA')).toBeInTheDocument();
    expect(screen.getByText('NVIDIA Corp')).toBeInTheDocument();
    expect(screen.getByText('217.55')).toBeInTheDocument();
    expect(screen.getByText('1.8')).toBeInTheDocument();
    expect(load).toHaveBeenCalledOnce();
  });

  it('refreshes provider signals and reloads Discovery', async () => {
    const load = vi.fn(async () => discovery);
    const cockpit = createGatewayStub({
      getDiscovery: load,
      refreshSignals: vi.fn(async () => ({
        scope: 'STRATEGY' as const,
        archived: 12,
        refreshed: [
          {
            strategyId: 'MOMENTUM_BREAKOUT',
            strategyVersion: '1.0',
            signalCount: 12,
            archived: 12
          }
        ]
      }))
    });
    render(<Discovery gateway={cockpit} />);
    await screen.findByText('NVDA');

    fireEvent.change(screen.getByRole('combobox', { name: /Strategy/i }), {
      target: { value: 'MOMENTUM_BREAKOUT::1.0' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh Signals' }));

    expect(
      await screen.findByText(/12 signal\(s\) refreshed for MOMENTUM_BREAKOUT/)
    ).toBeInTheDocument();
    expect(cockpit.refreshSignals).toHaveBeenCalledWith({ strategyId: 'MOMENTUM_BREAKOUT' });
    expect(load).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: 'Refresh Ranking' })).not.toBeInTheDocument();
  });

  it('does not refresh the provider when the strategy filter changes', async () => {
    const cockpit = createGatewayStub({
      getDiscovery: vi.fn(async () => discovery)
    });
    render(<Discovery gateway={cockpit} />);
    await screen.findByText('NVDA');

    fireEvent.change(screen.getByRole('combobox', { name: /Strategy/i }), {
      target: { value: 'MOMENTUM_BREAKOUT::1.0' }
    });

    expect(cockpit.refreshSignals).not.toHaveBeenCalled();
    expect(cockpit.refreshAllSignals).not.toHaveBeenCalled();
  });

  it('keeps scoped refresh unavailable when all strategies are selected and supports refresh all', async () => {
    const load = vi.fn(async () => discovery);
    const cockpit = createGatewayStub({
      getDiscovery: load,
      refreshAllSignals: vi.fn(async () => ({
        scope: 'ALL' as const,
        archived: 12,
        refreshed: []
      }))
    });
    render(<Discovery gateway={cockpit} />);
    await screen.findByText('NVDA');

    expect(screen.getByRole('button', { name: 'Refresh Signals' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh All' }));

    expect(
      await screen.findByText(/12 signal\(s\) refreshed across all active strategies/)
    ).toBeInTheDocument();
    expect(cockpit.refreshAllSignals).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('adds a Discovery candidate to Watchlist through the gateway identity command', async () => {
    const load = vi.fn(async () => discovery);
    const cockpit = createGatewayStub({
      getDiscovery: load,
      addDiscoveryCandidateToWatchlist: vi.fn(async () => ({
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
    expect(cockpit.addDiscoveryCandidateToWatchlist).toHaveBeenCalledWith({
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyVersion: '1.0',
      signalDate: '2026-08-28',
      ticker: 'NVDA'
    });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('shows already watched candidates as non-addable and opens candidate details', async () => {
    render(
      <Discovery gateway={createGatewayStub({ getDiscovery: vi.fn(async () => discovery) })} />
    );
    const row = await screen.findByRole('row', { name: /BOX/ });

    expect(within(row).getByRole('button', { name: 'Add BOX to Watchlist' })).toBeDisabled();
    fireEvent.click(within(row).getByRole('button', { name: 'View BOX Discovery details' }));

    const dialog = screen.getByRole('dialog', { name: 'BOX' });
    expect(within(dialog).getByRole('heading', { name: 'Candidate' })).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Screener snapshot' })).toBeInTheDocument();
    expect(within(dialog).getByText('PLANNED')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
