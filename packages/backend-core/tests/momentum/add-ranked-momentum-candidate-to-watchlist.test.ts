import { describe, expect, it, vi } from 'vitest';
import { createAddRankedMomentumCandidateToWatchlist } from '@trading-cockpit/backend-core/application/momentum/add-ranked-momentum-candidate-to-watchlist';
import type { AddCandidateToWatchlist } from '@trading-cockpit/backend-core/application/watchlist/add-candidate-to-watchlist';
import type { MomentumRankingRecord } from '@trading-cockpit/backend-core/ports/outbound/momentum-ranking-reader';
import type { WatchlistEntry } from '@trading-cockpit/backend-core/domain/watchlist';

const rankingRecord: MomentumRankingRecord = {
  strategyId: 'MOMENTUM_BREAKOUT',
  strategy: 'Momentum Breakout',
  strategyVersion: 'V1',
  signalDate: '2026-08-28',
  ticker: 'BOX',
  company: 'Box, Inc.',
  sector: 'Technology',
  price: 34.98,
  high52: 36,
  high52Score: 18,
  relativeVolume: 1.5,
  relativeVolumeScore: 20,
  performanceMonth: 0.09,
  performanceScore: 10,
  rsi: 59,
  rsiScore: 12,
  sma20: 1.02,
  sma20Score: 5,
  total: 65,
  reviewStatus: 'READY'
};

function watchlistEntry(overrides: Partial<WatchlistEntry> = {}): WatchlistEntry {
  return {
    id: 'WL-1',
    strategyId: 'MOMENTUM_BREAKOUT',
    strategyName: 'Momentum Breakout',
    strategyVersion: 'V1',
    signalDate: '2026-08-28',
    ticker: 'BOX',
    company: 'Box, Inc.',
    sector: 'Technology',
    signalPrice: 34.98,
    currentPrice: null,
    momentumScore: 65,
    status: 'WATCHING',
    setupStatus: '',
    breakoutLevel: null,
    invalidationLevel: null,
    earningsDate: null,
    eventRisk: '',
    notes: '',
    closedAt: '',
    addedAt: new Date('2026-08-28T16:00:00.000Z'),
    ...overrides
  };
}

describe('add ranked Momentum candidate to Watchlist', () => {
  it('resolves the ranking candidate by identity and delegates backend-owned values', () => {
    const addCandidateToWatchlist = vi.fn<AddCandidateToWatchlist>(() => ({
      kind: 'added',
      entry: watchlistEntry()
    }));
    const add = createAddRankedMomentumCandidateToWatchlist({
      rankingReader: {
        findAll: () => [],
        findByIdentity: vi.fn(() => rankingRecord)
      },
      addCandidateToWatchlist
    });

    const result = add({
      strategyId: 'momentum_breakout',
      strategyVersion: 'V1',
      signalDate: '2026-08-28',
      ticker: 'box'
    });

    expect(addCandidateToWatchlist).toHaveBeenCalledWith({
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyName: 'Momentum Breakout',
      strategyVersion: 'V1',
      signalDate: '2026-08-28',
      ticker: 'BOX',
      company: 'Box, Inc.',
      sector: 'Technology',
      signalPrice: 34.98,
      momentumScore: 65
    });
    expect(result).toEqual({
      kind: 'added',
      watchlistId: 'WL-1',
      ticker: 'BOX',
      status: 'WATCHING'
    });
  });

  it('preserves the existing duplicate result from AddCandidateToWatchlist', () => {
    const add = createAddRankedMomentumCandidateToWatchlist({
      rankingReader: {
        findAll: () => [],
        findByIdentity: () => rankingRecord
      },
      addCandidateToWatchlist: () => ({
        kind: 'duplicate',
        identity: {
          strategyId: 'MOMENTUM_BREAKOUT',
          strategyVersion: 'V1',
          ticker: 'BOX'
        },
        existing: watchlistEntry({ status: 'PLANNED' })
      })
    });

    expect(
      add({
        strategyId: 'MOMENTUM_BREAKOUT',
        strategyVersion: 'V1',
        signalDate: '2026-08-28',
        ticker: 'BOX'
      })
    ).toEqual({
      kind: 'duplicate',
      watchlistId: 'WL-1',
      ticker: 'BOX',
      status: 'PLANNED'
    });
  });

  it('does not add when the candidate is absent from the persisted ranking', () => {
    const addCandidateToWatchlist = vi.fn<AddCandidateToWatchlist>();
    const add = createAddRankedMomentumCandidateToWatchlist({
      rankingReader: {
        findAll: () => [],
        findByIdentity: () => null
      },
      addCandidateToWatchlist
    });

    expect(() =>
      add({
        strategyId: 'MOMENTUM_BREAKOUT',
        strategyVersion: 'V1',
        signalDate: '2026-08-28',
        ticker: 'BOX'
      })
    ).toThrow('Candidat Momentum introuvable');
    expect(addCandidateToWatchlist).not.toHaveBeenCalled();
  });
});
