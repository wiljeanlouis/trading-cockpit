import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../../src/app/App';
import { createGatewayStub } from '../support/cockpit-gateway';

describe('App navigation', () => {
  it('opens the Watchlist screen from the existing cockpit navigation', async () => {
    const gateway = createGatewayStub({
      getDashboardSummary: vi.fn(async () => ({
        generatedAt: '2026-08-28T16:04:00.000Z',
        signals: 0,
        watchlist: 0,
        ready: 0,
        activeTradePlans: 0,
        openPositions: 0,
        closedTrades: 0
      })),
      getWatchlist: vi.fn(async () => ({ generatedAt: '2026-08-28T16:04:00.000Z', items: [] })),
      getTradePlans: vi.fn(async () => ({ generatedAt: '2026-08-28T16:04:00.000Z', items: [] }))
    });
    render(
      <MemoryRouter>
        <App gateway={gateway} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('link', { name: 'Watchlist' }));

    expect(await screen.findByRole('heading', { name: 'Watchlist' })).toBeInTheDocument();
    expect(gateway.getWatchlist).toHaveBeenCalledOnce();
  });

  it('opens the Discovery workspace from navigation', async () => {
    const gateway = createGatewayStub({
      getMomentumRanking: vi.fn(async () => ({
        generatedAt: '2026-08-28T16:04:00.000Z',
        items: []
      }))
    });
    render(
      <MemoryRouter>
        <App gateway={gateway} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('link', { name: 'Discovery' }));

    expect(await screen.findByRole('heading', { name: 'Discovery' })).toBeInTheDocument();
    expect(gateway.getMomentumRanking).toHaveBeenCalledOnce();
  });

  it('opens the Watchlist directly from its route', async () => {
    const gateway = createGatewayStub({
      getWatchlist: vi.fn(async () => ({
        generatedAt: '2026-08-28T16:04:00.000Z',
        items: []
      })),
      getTradePlans: vi.fn(async () => ({ generatedAt: '2026-08-28T16:04:00.000Z', items: [] }))
    });

    render(
      <MemoryRouter initialEntries={['/watchlist']}>
        <App gateway={gateway} />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Watchlist' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Watchlist' })).toHaveAttribute('aria-current', 'page');
    expect(gateway.getDashboardSummary).not.toHaveBeenCalled();
  });

  it('opens the Trade Plans workspace from navigation', async () => {
    const gateway = createGatewayStub({
      getTradePlans: vi.fn(async () => ({
        generatedAt: '2026-08-28T16:04:00.000Z',
        items: []
      }))
    });
    render(
      <MemoryRouter>
        <App gateway={gateway} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('link', { name: 'Trade Plans' }));

    expect(await screen.findByRole('heading', { name: 'Trade Plans' })).toBeInTheDocument();
    expect(gateway.getTradePlans).toHaveBeenCalledOnce();
  });

  it('opens the Positions workspace from navigation', async () => {
    const gateway = createGatewayStub({
      getOpenPositions: vi.fn(async () => ({
        generatedAt: '2026-08-28T16:04:00.000Z',
        items: []
      }))
    });
    render(
      <MemoryRouter>
        <App gateway={gateway} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('link', { name: 'Positions' }));

    expect(await screen.findByRole('heading', { name: 'Positions' })).toBeInTheDocument();
    expect(gateway.getOpenPositions).toHaveBeenCalledOnce();
  });

  it('opens the Journal workspace from navigation', async () => {
    const gateway = createGatewayStub({
      getJournal: vi.fn(async () => ({
        generatedAt: '2026-08-28T16:04:00.000Z',
        items: []
      }))
    });
    render(
      <MemoryRouter>
        <App gateway={gateway} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('link', { name: 'Journal' }));

    expect(await screen.findByRole('heading', { name: 'Journal' })).toBeInTheDocument();
    expect(gateway.getJournal).toHaveBeenCalledOnce();
  });
});
