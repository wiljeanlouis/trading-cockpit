import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
      getWatchlist: vi.fn(async () => ({ generatedAt: '2026-08-28T16:04:00.000Z', items: [] }))
    };
    render(<App gateway={gateway} />);

    fireEvent.click(screen.getByRole('button', { name: 'Watchlist' }));

    expect(await screen.findByRole('heading', { name: 'Watchlist' })).toBeInTheDocument();
    expect(gateway.getWatchlist).toHaveBeenCalledOnce();
  });
});
