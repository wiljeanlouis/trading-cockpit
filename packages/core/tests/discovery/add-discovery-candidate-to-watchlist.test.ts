import { describe, expect, it, vi } from 'vitest';
import { createAddDiscoveryCandidateToWatchlist } from '@trading-cockpit/core/application/discovery/add-discovery-candidate-to-watchlist';
import type { SignalSnapshot } from '@trading-cockpit/core/domain/market-signal';
import type { AddCandidateToWatchlist } from '@trading-cockpit/core/application/watchlist/add-candidate-to-watchlist';

const signal: SignalSnapshot = {
  signalDate: '2026-08-28',
  detectedAt: new Date('2026-08-28T14:30:00.000Z'),
  strategyId: 'MOMENTUM_BREAKOUT',
  strategyName: 'Momentum Breakout',
  strategyVersion: 'V1',
  ticker: 'BOX',
  attributes: {
    Company: 'Box Inc',
    Sector: 'Technology',
    Price: 34.82
  }
};

describe('add Discovery candidate to Watchlist', () => {
  it('resolves the candidate from Signals History before delegating to Watchlist rules', () => {
    const addCandidateToWatchlist = vi.fn((command) => ({
      kind: 'added' as const,
      entry: {
        id: 'WL-1',
        ...command,
        addedAt: new Date('2026-08-28T15:00:00.000Z'),
        currentPrice: command.signalPrice,
        status: 'WATCHING',
        setupStatus: '',
        breakoutLevel: null,
        invalidationLevel: null,
        earningsDate: null,
        eventRisk: '',
        notes: '',
        closedAt: null
      }
    })) satisfies AddCandidateToWatchlist;
    const addDiscoveryCandidate = createAddDiscoveryCandidateToWatchlist({
      signalReader: {
        findAllSignals: () => [signal],
        findAllStrategies: () => [],
        findAllStrategyVersions: () => []
      },
      addCandidateToWatchlist
    });

    const result = addDiscoveryCandidate({
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyVersion: 'V1',
      signalDate: '2026-08-28',
      ticker: 'BOX'
    });

    expect(addCandidateToWatchlist).toHaveBeenCalledWith({
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyName: 'Momentum Breakout',
      strategyVersion: 'V1',
      signalDate: '2026-08-28',
      ticker: 'BOX',
      company: 'Box Inc',
      sector: 'Technology',
      signalPrice: 34.82,
      momentumScore: null
    });
    expect(result).toEqual({
      kind: 'added',
      watchlistId: 'WL-1',
      ticker: 'BOX',
      status: 'WATCHING'
    });
  });

  it('rejects candidates that are not present in authoritative Signals History', () => {
    const addDiscoveryCandidate = createAddDiscoveryCandidateToWatchlist({
      signalReader: {
        findAllSignals: () => [],
        findAllStrategies: () => [],
        findAllStrategyVersions: () => []
      },
      addCandidateToWatchlist: vi.fn()
    });

    expect(() =>
      addDiscoveryCandidate({
        strategyId: 'MOMENTUM_BREAKOUT',
        strategyVersion: 'V1',
        signalDate: '2026-08-28',
        ticker: 'BOX'
      })
    ).toThrow('Candidat Discovery introuvable');
  });
});
