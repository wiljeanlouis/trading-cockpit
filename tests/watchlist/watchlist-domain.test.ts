import { describe, expect, it } from 'vitest';
import {
  createWatchlistEntry,
  isActiveWatchlistStatus,
  normalizeWatchlistCandidate,
  sameWatchlistIdentity,
  watchlistIdentityOf,
  type WatchlistCandidate
} from '../../src/core/domain/watchlist';

const candidate: WatchlistCandidate = {
  strategyId: ' momentum_breakout ',
  strategyName: ' Momentum Breakout ',
  strategyVersion: ' V1 ',
  signalDate: '2026-08-27',
  ticker: ' urnb ',
  company: 'Urban Outfitters',
  sector: 'Consumer Cyclical',
  signalPrice: 54.25,
  momentumScore: 88
};

describe('Watchlist domain', () => {
  it('normalizes the candidate identity while preserving the ranking snapshot', () => {
    expect(normalizeWatchlistCandidate(candidate)).toEqual({
      ...candidate,
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyName: 'Momentum Breakout',
      strategyVersion: 'V1',
      ticker: 'URNB'
    });
  });

  it('normalizes ticker and Strategy ID but keeps Strategy Version case-sensitive', () => {
    expect(
      sameWatchlistIdentity(
        { strategyId: ' momentum_breakout ', strategyVersion: 'V1', ticker: ' urnb ' },
        { strategyId: 'MOMENTUM_BREAKOUT', strategyVersion: 'V1', ticker: 'URNB' }
      )
    ).toBe(true);

    expect(
      sameWatchlistIdentity(
        { strategyId: 'MOMENTUM_BREAKOUT', strategyVersion: 'V1', ticker: 'URNB' },
        { strategyId: 'MOMENTUM_BREAKOUT', strategyVersion: 'v1', ticker: 'URNB' }
      )
    ).toBe(false);
  });

  it.each(['CLOSED', ' rejected ', 'Rejected'])('treats %s as terminal', (status) => {
    expect(isActiveWatchlistStatus(status)).toBe(false);
  });

  it.each(['WATCHING', 'READY', 'PLANNED', 'ENTERED', '', 'UNKNOWN'])(
    'treats %s as active',
    (status) => {
      expect(isActiveWatchlistStatus(status)).toBe(true);
    }
  );

  it('creates the exact initial defaults without Sheet-derived calculated fields', () => {
    const normalized = normalizeWatchlistCandidate(candidate);
    const addedAt = new Date('2026-08-27T14:00:00.000Z');
    const entry = createWatchlistEntry(normalized, 'watchlist-id', addedAt);

    expect(entry).toEqual({
      id: 'watchlist-id',
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyName: 'Momentum Breakout',
      strategyVersion: 'V1',
      signalDate: '2026-08-27',
      ticker: 'URNB',
      company: 'Urban Outfitters',
      sector: 'Consumer Cyclical',
      addedAt,
      signalPrice: 54.25,
      momentumScore: 88,
      status: 'WATCHING',
      setupStatus: '',
      breakoutLevel: '',
      invalidationLevel: '',
      earningsDate: '',
      eventRisk: '',
      notes: '',
      closedAt: ''
    });
    expect(watchlistIdentityOf(entry)).toEqual({
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyVersion: 'V1',
      ticker: 'URNB'
    });
  });

  it.each([
    ['Strategy ID', { strategyId: ' ' }, 'Strategy ID absent de la ligne sélectionnée.'],
    ['Strategy', { strategyName: ' ' }, 'Strategy absente de la ligne sélectionnée.'],
    [
      'Strategy Version',
      { strategyVersion: ' ' },
      'Strategy Version absente de la ligne sélectionnée.'
    ],
    ['Signal Date', { signalDate: '' }, 'Signal Date absente de la ligne sélectionnée.'],
    ['Ticker', { ticker: '' }, 'Ticker absent de la ligne sélectionnée.']
  ] as const)('rejects a missing %s', (_field, override, message) => {
    expect(() => normalizeWatchlistCandidate({ ...candidate, ...override })).toThrow(message);
  });

  it('preserves the legacy whitespace-only ticker behavior', () => {
    expect(normalizeWatchlistCandidate({ ...candidate, ticker: '   ' }).ticker).toBe('');
  });
});
