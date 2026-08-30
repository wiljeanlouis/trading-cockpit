import { describe, expect, it, vi } from 'vitest';
import { createGetMomentumRanking } from '../../src/core/application/momentum/get-momentum-ranking';
import type { WatchlistEntry } from '../../src/core/domain/watchlist';
import type { MomentumRankingRecord } from '../../src/ports/outbound/momentum-ranking-reader';

function rankingRecord(overrides: Partial<MomentumRankingRecord> = {}): MomentumRankingRecord {
  return {
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
    reviewStatus: 'READY',
    ...overrides
  };
}

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

describe('get Momentum Ranking', () => {
  it('reads Watchlist once and enriches all ranking candidates in memory', () => {
    const findMomentum = vi.fn(() => [
      rankingRecord({ ticker: 'BOX' }),
      rankingRecord({ ticker: 'URBN', total: 91 }),
      rankingRecord({ ticker: 'DK', total: 81 })
    ]);
    const findWatchlist = vi.fn(() => [
      watchlistEntry({ ticker: 'BOX', status: 'PLANNED' }),
      watchlistEntry({ ticker: 'URBN', status: 'REJECTED' }),
      watchlistEntry({ ticker: 'DK', status: 'WATCHING' })
    ]);
    const getMomentumRanking = createGetMomentumRanking({
      reader: {
        findAll: findMomentum,
        findByIdentity: () => null
      },
      watchlistReader: {
        findAll: findWatchlist
      },
      now: () => new Date('2026-08-30T12:00:00.000Z')
    });

    const result = getMomentumRanking();

    expect(findMomentum).toHaveBeenCalledTimes(1);
    expect(findWatchlist).toHaveBeenCalledTimes(1);
    expect(result.items.map((item) => item.ticker)).toEqual(['BOX', 'URBN', 'DK']);
    expect(result.items.map((item) => item.watchlistStatus)).toEqual(['PLANNED', null, 'WATCHING']);
  });
});
