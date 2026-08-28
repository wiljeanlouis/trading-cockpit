import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { CockpitGateway } from '../../src/infrastructure/cockpit-gateway';
import { App } from '../../src/app/App';

describe('App navigation', () => {
  it('opens the Watchlist screen from the existing cockpit navigation', async () => {
    const gateway: CockpitGateway = {
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
      getTradingAccounts: vi.fn(async () => ({ accounts: [] })),
      createTradePlan: vi.fn(),
      getTradePlans: vi.fn(async () => ({ generatedAt: '2026-08-28T16:04:00.000Z', items: [] }))
    };
    render(
      <MemoryRouter>
        <App gateway={gateway} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('link', { name: 'Watchlist' }));

    expect(await screen.findByRole('heading', { name: 'Watchlist' })).toBeInTheDocument();
    expect(gateway.getWatchlist).toHaveBeenCalledOnce();
  });

  it('opens the Watchlist directly from its route', async () => {
    const gateway: CockpitGateway = {
      getDashboardSummary: vi.fn(),
      getWatchlist: vi.fn(async () => ({
        generatedAt: '2026-08-28T16:04:00.000Z',
        items: []
      })),
      getTradingAccounts: vi.fn(async () => ({ accounts: [] })),
      createTradePlan: vi.fn(),
      getTradePlans: vi.fn(async () => ({ generatedAt: '2026-08-28T16:04:00.000Z', items: [] }))
    };

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
    const gateway: CockpitGateway = {
      getDashboardSummary: vi.fn(),
      getWatchlist: vi.fn(),
      getTradingAccounts: vi.fn(),
      createTradePlan: vi.fn(),
      getTradePlans: vi.fn(async () => ({
        generatedAt: '2026-08-28T16:04:00.000Z',
        items: []
      }))
    };
    render(
      <MemoryRouter>
        <App gateway={gateway} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('link', { name: 'Trade Plans' }));

    expect(await screen.findByRole('heading', { name: 'Trade Plans' })).toBeInTheDocument();
    expect(gateway.getTradePlans).toHaveBeenCalledOnce();
  });
});
