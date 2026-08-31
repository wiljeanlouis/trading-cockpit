import { describe, expect, it } from 'vitest';
import type { WatchlistEntry } from '@trading-cockpit/core/domain/watchlist';
import { createGetWatchlist } from '@trading-cockpit/core/application/watchlist/get-watchlist';

const entry: WatchlistEntry = {
  id: 'W1',
  strategyId: 'MOMENTUM_BREAKOUT',
  strategyName: 'Momentum Breakout',
  strategyVersion: '1.0',
  signalDate: new Date('2026-08-27T04:00:00.000Z'),
  ticker: 'BOX',
  company: 'Box, Inc.',
  sector: 'Technology',
  addedAt: new Date('2026-08-27T14:00:00.000Z'),
  signalPrice: 33.2,
  currentPrice: 34.82,
  momentumScore: 87,
  status: 'READY',
  setupStatus: 'VALID',
  breakoutLevel: 35,
  invalidationLevel: 31,
  earningsDate: null,
  eventRisk: '',
  notes: '',
  closedAt: ''
};

describe('get Watchlist', () => {
  it('returns a stable serializable read model from existing Watchlist entries', () => {
    const getWatchlist = createGetWatchlist({
      reader: { findAll: () => [entry] },
      now: () => new Date('2026-08-28T16:04:00.000Z')
    });

    expect(getWatchlist()).toEqual({
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
          signalPrice: 33.2,
          currentPrice: 34.82,
          momentumScore: 87,
          status: 'READY',
          setupStatus: 'VALID',
          breakoutLevel: 35,
          invalidationLevel: 31,
          earningsDate: null,
          eventRisk: null,
          notes: null
        }
      ]
    });
    expect(JSON.parse(JSON.stringify(getWatchlist()))).toBeTruthy();
  });

  it('does not coerce unavailable formula values into financial numbers', () => {
    const getWatchlist = createGetWatchlist({
      reader: { findAll: () => [{ ...entry, currentPrice: '#N/A', momentumScore: '' }] },
      now: () => new Date('2026-08-28T16:04:00.000Z')
    });

    expect(getWatchlist().items[0]).toMatchObject({ currentPrice: null, momentumScore: null });
  });
});
