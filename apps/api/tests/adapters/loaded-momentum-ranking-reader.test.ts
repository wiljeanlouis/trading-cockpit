import { describe, expect, it } from 'vitest';

import { LoadedMomentumRankingReader } from '../../src/adapters/outbound/google-sheets-api/cockpit-query-readers';

import type { MomentumRankingRecord } from '@trading-cockpit/core/ports/outbound/momentum-ranking-reader';

function momentumCandidate(overrides: Partial<MomentumRankingRecord> = {}): MomentumRankingRecord {
  return {
    strategyId: 'MOMENTUM_BREAKOUT',
    strategy: 'Momentum Breakout',
    strategyVersion: 'V1',
    signalDate: '2026-09-01',
    ticker: 'HLX',
    company: 'Helix Energy Solutions Group',
    sector: 'Energy',
    price: 6.25,
    high52Week: 7,
    relativeVolume: 1.5,
    performanceMonth: 0.1,
    rsi: 62,
    sma20: 0.04,
    score52Week: 20,
    scoreRelativeVolume: 20,
    scorePerformance: 20,
    scoreRsi: 20,
    scoreSma20: 20,
    total: 100,
    reviewStatus: '',
    ...overrides
  } as MomentumRankingRecord;
}

describe('LoadedMomentumRankingReader', () => {
  it('returns all loaded Momentum Ranking records', () => {
    const hlx = momentumCandidate();
    const box = momentumCandidate({
      ticker: 'BOX',
      company: 'Box',
      price: 35
    });

    const reader = new LoadedMomentumRankingReader([hlx, box]);

    expect(reader.findAll()).toEqual([hlx, box]);
  });

  it('finds a Momentum candidate by its complete business identity', () => {
    const candidate = momentumCandidate();

    const reader = new LoadedMomentumRankingReader([candidate]);

    const result = reader.findByIdentity({
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyVersion: 'V1',
      signalDate: '2026-09-01',
      ticker: 'HLX'
    });

    expect(result).toEqual(candidate);
  });

  it('normalizes Strategy ID and ticker casing when matching identity', () => {
    const candidate = momentumCandidate();

    const reader = new LoadedMomentumRankingReader([candidate]);

    const result = reader.findByIdentity({
      strategyId: 'momentum_breakout',
      strategyVersion: 'V1',
      signalDate: '2026-09-01',
      ticker: 'hlx'
    });

    expect(result).toEqual(candidate);
  });

  it('returns null when Signal Date does not match', () => {
    const candidate = momentumCandidate();

    const reader = new LoadedMomentumRankingReader([candidate]);

    const result = reader.findByIdentity({
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyVersion: 'V1',
      signalDate: '2026-09-02',
      ticker: 'HLX'
    });

    expect(result).toBeNull();
  });

  it('returns null when Strategy Version does not match', () => {
    const candidate = momentumCandidate();

    const reader = new LoadedMomentumRankingReader([candidate]);

    const result = reader.findByIdentity({
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyVersion: 'V2',
      signalDate: '2026-09-01',
      ticker: 'HLX'
    });

    expect(result).toBeNull();
  });

  it('returns null when ticker does not match', () => {
    const candidate = momentumCandidate();

    const reader = new LoadedMomentumRankingReader([candidate]);

    const result = reader.findByIdentity({
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyVersion: 'V1',
      signalDate: '2026-09-01',
      ticker: 'BOX'
    });

    expect(result).toBeNull();
  });

  it('does not match another strategy with the same ticker and date', () => {
    const candidate = momentumCandidate();

    const reader = new LoadedMomentumRankingReader([candidate]);

    const result = reader.findByIdentity({
      strategyId: 'ANOTHER_STRATEGY',
      strategyVersion: 'V1',
      signalDate: '2026-09-01',
      ticker: 'HLX'
    });

    expect(result).toBeNull();
  });

  it('selects the correct candidate when several records are loaded', () => {
    const hlx = momentumCandidate();

    const box = momentumCandidate({
      ticker: 'BOX',
      company: 'Box',
      price: 35
    });

    const olderHlx = momentumCandidate({
      signalDate: '2026-08-31'
    });

    const reader = new LoadedMomentumRankingReader([box, olderHlx, hlx]);

    const result = reader.findByIdentity({
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyVersion: 'V1',
      signalDate: '2026-09-01',
      ticker: 'HLX'
    });

    expect(result).toEqual(hlx);
  });
});
